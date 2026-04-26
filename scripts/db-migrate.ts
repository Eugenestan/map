import { loadEnvConfig } from "@next/env";
import { promises as fs } from "fs";
import path from "path";
import { closeDb, withTransaction, execute } from "../src/lib/db";

loadEnvConfig(process.cwd());

async function main() {
  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  await execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const appliedRows = await execute<{ filename: string }>("SELECT filename FROM schema_migrations ORDER BY filename ASC");
  const applied = new Set(appliedRows.map((row) => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await withTransaction(async (db) => {
      await db.unsafe(sql);
      await db.unsafe("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    });

    console.log(`Applied migration: ${file}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
