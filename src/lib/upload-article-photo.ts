export const MAX_ARTICLE_PHOTOS = 10;
export const MAX_PHOTO_FILE_BYTES = 8 * 1024 * 1024;

interface UploadResponse {
  url?: string;
  error?: string;
}

/**
 * Грузит одно изображение через /api/admin/uploads и возвращает публичный URL в S3.
 * Сжатие и конвертация в WebP происходят на сервере через sharp.
 */
export async function uploadArticlePhoto(file: File): Promise<string> {
  if (file.size > MAX_PHOTO_FILE_BYTES) {
    throw new Error(
      `Файл «${file.name}» больше ${Math.round(MAX_PHOTO_FILE_BYTES / (1024 * 1024))} МБ`,
    );
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    body: formData,
  });

  if (response.status === 401) {
    throw new Error("Требуется авторизация администратора");
  }

  let body: UploadResponse | null = null;
  try {
    body = (await response.json()) as UploadResponse;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.url) {
    throw new Error(body?.error || `Не удалось загрузить файл «${file.name}»`);
  }

  return body.url;
}
