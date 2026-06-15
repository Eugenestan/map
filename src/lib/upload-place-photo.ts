export const MAX_PLACE_PHOTOS = 5;
export const MAX_PLACE_PHOTO_FILE_BYTES = 10 * 1024 * 1024;

interface UploadResponse {
  url?: string;
  error?: string;
}

/**
 * Грузит одно изображение для места через публичный `/api/uploads/place-photo`
 * и возвращает публичный URL в S3. Сжатие и конвертация в WebP — на сервере (sharp).
 */
export async function uploadPlacePhoto(file: File): Promise<string> {
  if (file.size > MAX_PLACE_PHOTO_FILE_BYTES) {
    throw new Error(
      `Файл «${file.name}» больше ${Math.round(MAX_PLACE_PHOTO_FILE_BYTES / (1024 * 1024))} МБ`,
    );
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  const response = await fetch("/api/uploads/place-photo", {
    method: "POST",
    body: formData,
  });

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
