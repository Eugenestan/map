import type { TrustInfo, TrustLevel } from "@/types";

const RECENT_DAYS = 30;
const DISPUTE_THRESHOLD = 3;

export function getTrustInfo(level: TrustLevel): TrustInfo {
  switch (level) {
    case "recent":
      return {
        level,
        label: "Недавно добавлено",
        color: "text-green-700 bg-green-50 border-green-200",
        hint: "",
      };
    case "disputed":
      return {
        level,
        label: "Данные спорные",
        color: "text-red-700 bg-red-50 border-red-200",
        hint: "",
      };
  }
}

export function computePlaceTrust(
  isVerified: boolean,
  lastVerifiedAt: string | null,
  _tagsConfirm: number,
  tagsDispute: number
): TrustInfo | null {
  if (tagsDispute >= DISPUTE_THRESHOLD) {
    return {
      ...getTrustInfo("disputed"),
      hint: "По тегам места накопились споры между пользователями — сверьте информацию на месте и в отзывах.",
    };
  }

  if (isVerified && lastVerifiedAt) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince <= RECENT_DAYS) {
      return {
        ...getTrustInfo("recent"),
        hint: "Место было добавлено менее 30 дней назад",
      };
    }
  }

  return null;
}
