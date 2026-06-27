import type { Place } from "@/types";

const RU_TO_LAT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function transliterateRu(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((char) => RU_TO_LAT[char] ?? char)
    .join("");
}

export function slugifyPlaceTitle(title: string): string {
  return transliterateRu(title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10)
    .join("-")
    .replace(/-+/g, "-");
}

export function getPlacePublicSlug(place: Pick<Place, "id" | "slug" | "title">): string {
  return slugifyPlaceTitle(place.title) || place.slug || place.id;
}

export function getPlacePath(place: Pick<Place, "id" | "slug" | "title">): string {
  return `/place/${encodeURIComponent(getPlacePublicSlug(place))}`;
}

/**
 * Путь на главную карту с автоматическим открытием карточки выбранного места.
 * Используется, когда мы хотим показать место в контексте карты (а не как
 * отдельную SEO-страницу `/place/[slug]`).
 */
export type PlaceMapAction = "review";

export function getPlaceMapPath(
  place: Pick<Place, "id" | "slug" | "title">,
  options?: { action?: PlaceMapAction },
): string {
  const params = new URLSearchParams({ place: getPlacePublicSlug(place) });
  if (options?.action) params.set("action", options.action);
  return `/?${params.toString()}`;
}
