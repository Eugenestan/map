/**
 * Миграция фото статей: base64 (data:image/*) → S3.
 *
 * Использование:
 *
 *   # Dry-run: посчитать сколько фото, сколько мегабайт, ничего не менять
 *   npm run articles:migrate-photos -- --dry-run
 *
 *   # Боевой запуск: бэкап + загрузка + апдейт БД
 *   npm run articles:migrate-photos
 *
 * Скрипт:
 *  1. Сохраняет полный снэпшот articles.photo_urls в data/article-photos-backup-<ts>.json
 *  2. Для каждого фото с data:image/... декодирует, жмёт в WebP (sharp), грузит в S3
 *  3. Обновляет articles.photo_urls новой версией массива
 *  4. Идемпотентен: уже мигрированные строки (http/https) пропускает
 */

import { loadEnvConfig } from "@next/env";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

loadEnvConfig(process.cwd());

import { closeDb, execute, withTransaction } from "../src/lib/db";
import { assertS3Configured, uploadObject } from "../src/lib/s3";

interface ArticleRow {
  id: string;
  title: string;
  photo_urls: string[] | null;
}

interface MigrationStats {
  articlesScanned: number;
  articlesChanged: number;
  photosTotal: number;
  photosMigrated: number;
  photosAlreadyUrl: number;
  photosFailed: number;
  bytesUploaded: number;
}

const DATA_URL_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/;
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;

function parseArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2);
  return { dryRun: args.includes("--dry-run") };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function backupCurrent(articles: ArticleRow[]): Promise<string> {
  const dataDir = path.join(process.cwd(), "data");
  await fs.mkdir(dataDir, { recursive: true });
  const fileName = `article-photos-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const fullPath = path.join(dataDir, fileName);
  const snapshot = articles.map((row) => ({
    id: row.id,
    title: row.title,
    photo_urls: row.photo_urls ?? [],
  }));
  await fs.writeFile(fullPath, JSON.stringify(snapshot, null, 2), "utf8");
  return fullPath;
}

interface ProcessedPhoto {
  buffer: Buffer;
  contentType: string;
  extension: string;
  originalBytes: number;
}

async function processDataUrl(dataUrl: string): Promise<ProcessedPhoto | null> {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return null;
  const [, mimeRaw, base64] = match;
  const mime = mimeRaw.toLowerCase();
  const buffer = Buffer.from(base64, "base64");

  if (mime === "image/gif") {
    return {
      buffer,
      contentType: "image/gif",
      extension: "gif",
      originalBytes: buffer.length,
    };
  }

  const processed = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();

  return {
    buffer: processed,
    contentType: "image/webp",
    extension: "webp",
    originalBytes: buffer.length,
  };
}

async function main() {
  const { dryRun } = parseArgs();
  console.log(`\n=== Article photos migration: ${dryRun ? "DRY-RUN" : "LIVE"} ===\n`);

  if (!dryRun) {
    // Боевой запуск без S3 не имеет смысла — проверим заранее
    assertS3Configured();
  }

  const articles = await execute<ArticleRow>(
    "SELECT id, title, photo_urls FROM articles ORDER BY created_at ASC",
  );
  console.log(`Articles in DB: ${articles.length}`);

  const backupPath = await backupCurrent(articles);
  console.log(`Backup written: ${backupPath}\n`);

  const stats: MigrationStats = {
    articlesScanned: 0,
    articlesChanged: 0,
    photosTotal: 0,
    photosMigrated: 0,
    photosAlreadyUrl: 0,
    photosFailed: 0,
    bytesUploaded: 0,
  };

  for (const article of articles) {
    stats.articlesScanned += 1;
    const original = article.photo_urls ?? [];
    if (original.length === 0) continue;

    const next: string[] = [];
    let changed = false;

    for (let index = 0; index < original.length; index += 1) {
      const value = original[index];
      stats.photosTotal += 1;

      if (!value) {
        continue;
      }

      if (value.startsWith("http://") || value.startsWith("https://")) {
        stats.photosAlreadyUrl += 1;
        next.push(value);
        continue;
      }

      if (!value.startsWith("data:")) {
        console.warn(`  [${article.id}] photo #${index}: unknown format, skipped`);
        next.push(value);
        continue;
      }

      try {
        const processed = await processDataUrl(value);
        if (!processed) {
          throw new Error("Cannot parse data: URL");
        }

        const key = `articles/${article.id}/${uuid()}.${processed.extension}`;

        if (dryRun) {
          stats.photosMigrated += 1;
          stats.bytesUploaded += processed.buffer.length;
          console.log(
            `  [${article.id}] photo #${index}: would upload ${formatBytes(processed.buffer.length)}` +
              ` (was ${formatBytes(processed.originalBytes)}) -> ${key}`,
          );
          next.push(`<dry-run:${key}>`);
        } else {
          const { url } = await uploadObject({
            key,
            body: processed.buffer,
            contentType: processed.contentType,
          });
          stats.photosMigrated += 1;
          stats.bytesUploaded += processed.buffer.length;
          console.log(
            `  [${article.id}] photo #${index}: uploaded ${formatBytes(processed.buffer.length)}` +
              ` (was ${formatBytes(processed.originalBytes)}) -> ${url}`,
          );
          next.push(url);
        }
        changed = true;
      } catch (error) {
        stats.photosFailed += 1;
        console.error(`  [${article.id}] photo #${index}: FAILED`, error);
        // оставляем исходное значение, чтобы статья не потеряла фото
        next.push(value);
      }
    }

    if (!changed) continue;
    stats.articlesChanged += 1;

    if (dryRun) {
      console.log(`  [${article.id}] (dry-run) would update row "${article.title}"`);
      continue;
    }

    await withTransaction(async (sql) => {
      await sql.unsafe(
        "UPDATE articles SET photo_urls = $1::text[], updated_at = NOW() WHERE id = $2",
        [next, article.id],
      );
    });
  }

  console.log("\n=== Summary ===");
  console.log(`Articles scanned:        ${stats.articlesScanned}`);
  console.log(`Articles ${dryRun ? "to change" : "changed"}: ${stats.articlesChanged}`);
  console.log(`Photos total:            ${stats.photosTotal}`);
  console.log(`Photos already URL:      ${stats.photosAlreadyUrl}`);
  console.log(`Photos ${dryRun ? "would migrate" : "migrated"}:   ${stats.photosMigrated}`);
  console.log(`Photos failed:           ${stats.photosFailed}`);
  console.log(`Bytes uploaded:          ${formatBytes(stats.bytesUploaded)}`);
  console.log(`\nBackup file: ${backupPath}`);
  if (dryRun) {
    console.log("\nDRY-RUN complete. Re-run without --dry-run to actually migrate.");
  } else {
    console.log("\nMigration complete.");
  }
}

main()
  .catch((error) => {
    console.error("\nMigration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
