import type { TrustInfo, TrustLevel } from "@/types";

const FRESH_DAYS = 60;
const DISPUTE_THRESHOLD = 3;

export function computeTrustLevel(
  confirmCount: number,
  disputeCount: number,
  lastConfirmedAt: string | null
): TrustLevel {
  if (disputeCount >= DISPUTE_THRESHOLD) return "disputed";

  if (lastConfirmedAt) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastConfirmedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince <= FRESH_DAYS && confirmCount >= 1) return "fresh";
  }

  return "stale";
}

export function getTrustInfo(level: TrustLevel): TrustInfo {
  switch (level) {
    case "fresh":
      return { level, label: "Проверено недавно", color: "text-green-700 bg-green-50 border-green-200" };
    case "stale":
      return { level, label: "Давно не подтверждалось", color: "text-yellow-700 bg-yellow-50 border-yellow-200" };
    case "disputed":
      return { level, label: "Данные спорные", color: "text-red-700 bg-red-50 border-red-200" };
  }
}

export function computePlaceTrust(
  isVerified: boolean,
  lastVerifiedAt: string | null,
  tagsConfirm: number,
  tagsDispute: number
): TrustInfo {
  if (tagsDispute >= DISPUTE_THRESHOLD) {
    return getTrustInfo("disputed");
  }
  if (isVerified && lastVerifiedAt) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastVerifiedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince <= FRESH_DAYS) return getTrustInfo("fresh");
  }
  if (tagsConfirm >= 2) return getTrustInfo("fresh");
  return getTrustInfo("stale");
}
