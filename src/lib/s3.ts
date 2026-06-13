import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

let cachedClient: S3Client | null = null;

interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
}

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function getS3Config(): S3Config | null {
  const endpoint = readEnv("S3_ENDPOINT");
  const bucket = readEnv("S3_BUCKET");
  const accessKeyId = readEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("S3_SECRET_ACCESS_KEY");
  const publicBaseUrlRaw = readEnv("S3_PUBLIC_BASE_URL");

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const region = readEnv("S3_REGION") || "ru-1";
  const forcePathStyle = readEnv("S3_FORCE_PATH_STYLE") !== "false";
  const publicBaseUrl = (publicBaseUrlRaw || `${endpoint.replace(/\/$/, "")}/${bucket}`).replace(/\/$/, "");

  return {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    forcePathStyle,
  };
}

export function isS3Configured(): boolean {
  return getS3Config() !== null;
}

export function assertS3Configured(): S3Config {
  const config = getS3Config();
  if (!config) {
    throw new Error(
      "S3 is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.",
    );
  }
  return config;
}

function getClient(config: S3Config): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedClient;
}

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<UploadResult> {
  const config = assertS3Configured();
  const client = getClient(config);

  const input: PutObjectCommandInput = {
    Bucket: config.bucket,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    CacheControl: params.cacheControl ?? "public, max-age=31536000, immutable",
  };

  await client.send(new PutObjectCommand(input));
  return { key: params.key, url: buildPublicUrl(params.key) };
}

export function buildPublicUrl(key: string): string {
  const config = assertS3Configured();
  const normalizedKey = key.replace(/^\/+/, "");
  return `${config.publicBaseUrl}/${normalizedKey}`;
}

/**
 * Если URL принадлежит нашему бакету — возвращает S3-ключ объекта, иначе null.
 * Используется, чтобы удалять только «свои» файлы и не пытаться трогать внешние ссылки.
 */
export function extractKeyFromUrl(url: string): string | null {
  const config = getS3Config();
  if (!config) return null;
  if (!url || typeof url !== "string") return null;

  const base = config.publicBaseUrl;
  if (url.startsWith(`${base}/`)) {
    return url.slice(base.length + 1) || null;
  }

  const altBase = `${config.endpoint.replace(/\/$/, "")}/${config.bucket}`;
  if (altBase !== base && url.startsWith(`${altBase}/`)) {
    return url.slice(altBase.length + 1) || null;
  }

  return null;
}

export async function deleteObject(key: string): Promise<void> {
  const config = assertS3Configured();
  const client = getClient(config);
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const config = assertS3Configured();
  const client = getClient(config);

  const chunkSize = 1000;
  for (let index = 0; index < keys.length; index += chunkSize) {
    const chunk = keys.slice(index, index + chunkSize);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: config.bucket,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
          Quiet: true,
        },
      }),
    );
  }
}

export async function deleteObjectsByUrls(urls: string[]): Promise<void> {
  const keys = urls
    .map((url) => extractKeyFromUrl(url))
    .filter((key): key is string => Boolean(key));
  if (keys.length === 0) return;
  await deleteObjects(keys);
}
