import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";

const COOKIE = "nm_visitor";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getVisitorSessionFromRequest(req: NextRequest): { id: string; isNew: boolean } {
  const raw = req.cookies.get(COOKIE)?.value?.trim();
  if (raw && UUID_RE.test(raw)) {
    return { id: raw, isNew: false };
  }
  return { id: randomUUID(), isNew: true };
}

export const VISITOR_SESSION_COOKIE = COOKIE;
