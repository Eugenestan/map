import { expect, test } from "@playwright/test";

test("user can submit a review in anti-bot bypass mode", async ({ request }) => {
  const response = await request.post("/api/places/place-1/reviews", {
    data: {
      text: "Проверка smoke-сценария через Playwright.",
      author_name: "Playwright",
      turnstileToken: null,
    },
  });

  expect(response.status()).toBe(201);
  const payload = await response.json();
  expect(payload.data?.id).toBeTruthy();
});

test("admin can login", async ({ page, request, context }) => {
  const response = await request.post("/api/admin/login", {
    data: {
      email: "admin@example.com",
      password: "PlaywrightPass123",
    },
  });

  expect(response.status()).toBe(200);

  const setCookie = response.headers()["set-cookie"];
  expect(setCookie).toContain("nhatrang_admin_session=");

  const cookieValue = setCookie.match(/nhatrang_admin_session=([^;]+)/)?.[1];
  expect(cookieValue).toBeTruthy();

  await context.addCookies([
    {
      name: "nhatrang_admin_session",
      value: cookieValue!,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/admin");
  await expect(page.getByRole("button", { name: "Выйти" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Одобренные/i })).toBeVisible();
});
