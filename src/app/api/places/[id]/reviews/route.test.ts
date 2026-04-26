import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createReviewMock } = vi.hoisted(() => ({
  createReviewMock: vi.fn(),
}));

vi.mock("@/services/reviews", () => ({
  getReviewsByPlace: vi.fn(),
  createReview: createReviewMock,
}));

import { POST } from "@/app/api/places/[id]/reviews/route";

describe("POST /api/places/[id]/reviews", () => {
  beforeEach(() => {
    createReviewMock.mockReset();
    createReviewMock.mockResolvedValue({ id: "review-new" });
  });

  it("creates a review for valid payload", async () => {
    const request = new NextRequest("http://localhost/api/places/place-1/reviews", {
      method: "POST",
      body: JSON.stringify({
        text: "Отличное место",
        author_name: "Тест",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "place-1" }) });
    expect(response.status).toBe(201);
    expect(createReviewMock).toHaveBeenCalledOnce();
  });

  it("returns 400 for invalid review payload", async () => {
    const request = new NextRequest("http://localhost/api/places/place-1/reviews", {
      method: "POST",
      body: JSON.stringify({ text: "bad" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: Promise.resolve({ id: "place-1" }) });
    expect(response.status).toBe(400);
  });
});
