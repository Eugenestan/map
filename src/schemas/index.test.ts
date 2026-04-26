import { addPlaceSchema, addReviewSchema, adminUpdatePlaceSchema, adminUpdateReviewSchema } from "@/schemas";

describe("schemas", () => {
  it("accepts a valid place payload", () => {
    const result = addPlaceSchema.safeParse({
      title: "Клиника",
      category_id: "cat-1",
      lat: 12.24,
      lng: 109.19,
      tags: ["tag-1"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a place payload without coordinates", () => {
    const result = addPlaceSchema.safeParse({
      title: "Клиника",
      category_id: "cat-1",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid review payload", () => {
    const result = addReviewSchema.safeParse({
      place_id: "place-1",
      text: "Очень хорошее место",
      tags: ["tag-2"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects review with too many tags", () => {
    const result = addReviewSchema.safeParse({
      place_id: "place-1",
      text: "Очень хорошее место",
      tags: ["tag-1", "tag-2", "tag-3", "tag-4"],
    });

    expect(result.success).toBe(false);
  });

  it("accepts admin place update with status", () => {
    const result = adminUpdatePlaceSchema.safeParse({
      title: "Обновлённое место",
      category_id: "cat-1",
      lat: 12.24,
      lng: 109.19,
      status: "approved",
      is_verified: true,
    });

    expect(result.success).toBe(true);
  });

  it("accepts admin review update with moderation status", () => {
    const result = adminUpdateReviewSchema.safeParse({
      text: "Обновлённый отзыв",
      status: "hidden",
      tags: ["tag-1"],
    });

    expect(result.success).toBe(true);
  });
});
