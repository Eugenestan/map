import { expect, test } from "@playwright/test";

test("user can submit a review in anti-bot bypass mode", async ({ request }) => {
  const placesResponse = await request.get("/api/places");
  expect(placesResponse.status()).toBe(200);

  const placesPayload = await placesResponse.json();
  const firstPlaceId = placesPayload.data?.[0]?.id as string | undefined;
  expect(firstPlaceId).toBeTruthy();

  const response = await request.post(`/api/places/${firstPlaceId}/reviews`, {
    data: {
      text: "Проверка smoke-сценария через Playwright.",
      tags: ["tag-2"],
      author_name: "Playwright",
      turnstileToken: null,
    },
  });

  expect(response.status()).toBe(201);
  const payload = await response.json();
  expect(payload.data?.id).toBeTruthy();
});

test("admin can login", async ({ page }) => {
  const response = await page.request.post("/api/admin/login", {
    data: {
      email: "admin@example.com",
      password: "PlaywrightPass123",
    },
  });

  expect(response.status()).toBe(200);

  await page.goto("/admin");
  await expect(page.getByRole("button", { name: "Выйти" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Одобренные/i })).toBeVisible();
});
