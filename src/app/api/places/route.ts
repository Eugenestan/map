import { NextRequest, NextResponse } from "next/server";
import { getPlaces, createPlace } from "@/services/places";
import { addPlaceSchema, normalizePlaceCreateBody, zodIssuesToUserMessage } from "@/schemas";
import { parseSearchQuery } from "@/lib/search-parser";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstileOrResponse } from "@/lib/turnstile";
import type { PlacesFilter } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const filter: PlacesFilter = {};

    const search = params.get("search");
    if (search) {
      const intent = parseSearchQuery(search);
      filter.search = search;
      if (intent.categories.length > 0 && !params.get("category")) {
        filter.category = intent.categories[0];
      }
      if (intent.tags.length > 0 && !params.get("tags")) {
        filter.tags = intent.tags;
      }
    }

    if (params.get("category")) filter.category = params.get("category")!;
    if (params.get("tags")) filter.tags = params.get("tags")!.split(",");
    if (params.get("verifiedOnly") === "true") filter.verifiedOnly = true;
    if (params.get("hasReviewsOnly") === "true") filter.hasReviewsOnly = true;
    if (params.get("sort")) filter.sort = params.get("sort") as PlacesFilter["sort"];
    if (params.get("limit")) filter.limit = parseInt(params.get("limit")!);
    if (params.get("offset")) filter.offset = parseInt(params.get("offset")!);

    const north = params.get("north");
    const south = params.get("south");
    const east = params.get("east");
    const west = params.get("west");
    if (north && south && east && west) {
      filter.bbox = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west),
      };
    }

    const places = await getPlaces(filter);
    return NextResponse.json({ data: places, count: places.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при загрузке мест" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit({
      key: `create-place:${getClientIp(req)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return createRateLimitResponse("Слишком много заявок на добавление места. Попробуйте позже.", rateLimit.retryAfterMs);
    }

    const body = await req.json();
    const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : null;
    const payload = { ...body };
    delete payload.turnstileToken;

    const turnstileResponse = await verifyTurnstileOrResponse(req, turnstileToken);
    if (turnstileResponse) {
      return turnstileResponse;
    }

    const parsed = addPlaceSchema.safeParse(normalizePlaceCreateBody(payload));
    if (!parsed.success) {
      return NextResponse.json({ error: zodIssuesToUserMessage(parsed.error.issues) }, { status: 400 });
    }

    const result = await createPlace(parsed.data);
    return NextResponse.json({ data: result, message: "Место отправлено на модерацию" }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при создании места" }, { status: 500 });
  }
}
