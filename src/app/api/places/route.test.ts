import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPlaceMock } = vi.hoisted(() => ({
  createPlaceMock: vi.fn(),
}));

vi.mock("@/services/places", () => ({
  getPlaces: vi.fn(),
  createPlace: createPlaceMock,
}));

vi.mock("@/lib/search-parser", () => ({
  parseSearchQuery: vi.fn(() => ({ categories: [], tags: [] })),
}));

import { POST } from "@/app/api/places/route";

describe("POST /api/places", () => {
  beforeEach(() => {
    createPlaceMock.mockReset();
    createPlaceMock.mockResolvedValue({ id: "place-new" });
  });

  it("creates a place for valid payload", async () => {
    const request = new NextRequest("http://localhost/api/places", {
      method: "POST",
      body: JSON.stringify({
        title: "Новое место",
        category_id: "cat-1",
        lat: 12.24,
        lng: 109.19,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(createPlaceMock).toHaveBeenCalledOnce();
  });

  it("returns 400 for invalid payload", async () => {
    const request = new NextRequest("http://localhost/api/places", {
      method: "POST",
      body: JSON.stringify({ title: "x" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
