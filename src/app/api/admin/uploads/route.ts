import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { v4 as uuid } from "uuid";
import { requireAdmin } from "@/lib/admin-auth";
import { isS3Configured, uploadObject } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;

export async function POST(request: NextRequest) {
  const authResponse = requireAdmin(request);
  if (authResponse) {
    return authResponse;
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      {
        error:
          "S3 не настроен. Заполните S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY в .env.",
      },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("uploads: invalid multipart body", error);
    return NextResponse.json({ error: "Не удалось прочитать загружаемый файл" }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  if (!fileEntry || typeof fileEntry === "string") {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }

  const file = fileEntry as File;
  if (file.size <= 0) {
    return NextResponse.json({ error: "Пустой файл" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `Файл больше ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} МБ` },
      { status: 413 },
    );
  }

  const mime = (file.type || "").toLowerCase();
  if (!ACCEPTED_MIME.has(mime)) {
    return NextResponse.json(
      { error: "Поддерживаются только изображения: JPEG, PNG, WebP, GIF, AVIF" },
      { status: 415 },
    );
  }

  let inputBuffer: Buffer;
  try {
    inputBuffer = Buffer.from(await file.arrayBuffer());
  } catch (error) {
    console.error("uploads: cannot read file", error);
    return NextResponse.json({ error: "Не удалось прочитать файл" }, { status: 400 });
  }

  let processedBuffer: Buffer;
  let contentType: string;
  let extension: string;

  try {
    if (mime === "image/gif") {
      processedBuffer = inputBuffer;
      contentType = "image/gif";
      extension = "gif";
    } else {
      processedBuffer = await sharp(inputBuffer, { failOn: "none" })
        .rotate()
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toBuffer();
      contentType = "image/webp";
      extension = "webp";
    }
  } catch (error) {
    console.error("uploads: sharp failed", error);
    return NextResponse.json({ error: "Не удалось обработать изображение" }, { status: 400 });
  }

  const key = `articles/${uuid()}.${extension}`;

  try {
    const { url } = await uploadObject({
      key,
      body: processedBuffer,
      contentType,
    });
    return NextResponse.json({ url, key, size: processedBuffer.length, contentType }, { status: 201 });
  } catch (error) {
    console.error("uploads: S3 upload failed", error);
    return NextResponse.json({ error: "Не удалось загрузить в хранилище" }, { status: 502 });
  }
}
