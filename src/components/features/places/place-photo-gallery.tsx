"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface PlacePhotoGalleryProps {
  photos: string[];
  title: string;
  className?: string;
}

/**
 * Галерея фото места. Превью укладывается в одну строку (до 5 фото),
 * клик открывает полноэкранный просмотрщик со стрелками и закрытием по Esc.
 */
export function PlacePhotoGallery({ photos, title, className }: PlacePhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(null);
  const isOpen = activeIndex !== null;
  const total = photos.length;

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(() => {
    setActiveIndex((current) => (current === null ? current : (current - 1 + total) % total));
  }, [total]);
  const showNext = useCallback(() => {
    setActiveIndex((current) => (current === null ? current : (current + 1) % total));
  }, [total]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowLeft" && total > 1) {
        event.preventDefault();
        showPrev();
      } else if (event.key === "ArrowRight" && total > 1) {
        event.preventDefault();
        showNext();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, total, close, showPrev, showNext]);

  useEffect(() => {
    if (activeIndex === null || total <= 1) return;
    const neighbors = [(activeIndex + 1) % total, (activeIndex - 1 + total) % total];
    const preloaded = neighbors.map((index) => {
      const img = new Image();
      img.src = photos[index];
      return img;
    });
    return () => {
      preloaded.forEach((img) => {
        img.src = "";
      });
    };
  }, [activeIndex, photos, total]);

  if (total === 0) return null;

  const activePhoto = activeIndex !== null ? photos[activeIndex] : null;
  const isLoading = activePhoto !== null && loadedPhoto !== activePhoto;

  return (
    <>
      <div className={cn("flex flex-nowrap gap-2 overflow-x-auto", className)}>
        {photos.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Открыть фото ${index + 1} из ${total}`}
            className="group relative aspect-square flex-1 min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${title} — фото ${index + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {isOpen && activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Просмотр фото ${(activeIndex ?? 0) + 1} из ${total}`}
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/90"
          onClick={close}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
            aria-label="Закрыть просмотр"
            className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <X className="h-6 w-6" />
          </button>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrev();
                }}
                aria-label="Предыдущее фото"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white sm:left-4 sm:p-3"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNext();
                }}
                aria-label="Следующее фото"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white sm:right-4 sm:p-3"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          <div
            className="relative flex items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            {isLoading && (
              <div
                aria-hidden="true"
                className="absolute h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white"
              />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={activePhoto}
              src={activePhoto}
              alt={`${title} — фото ${(activeIndex ?? 0) + 1}`}
              onLoad={() => setLoadedPhoto(activePhoto)}
              onError={() => setLoadedPhoto(activePhoto)}
              className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>

          {total > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              {(activeIndex ?? 0) + 1} / {total}
            </div>
          )}
        </div>
      )}
    </>
  );
}
