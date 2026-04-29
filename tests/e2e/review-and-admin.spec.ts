import { expect, test } from "@playwright/test";

test("user can submit a review in anti-bot bypass mode", async ({ page }) => {
  await page.goto("/place/place-1");

  await page.getByRole("button", { name: "Отзыв" }).click();
  await expect(page.getByText("Оставить отзыв")).toBeVisible();
  await page.getByPlaceholder("Поделитесь своим опытом...").fill("Проверка smoke-сценария через Playwright.");
  await page.getByPlaceholder("Необязательно").fill("Playwright");

  const createReviewResponse = page.waitForResponse((response) =>
    response.url().includes("/api/places/place-1/reviews") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Отправить отзыв" }).click();
  expect((await createReviewResponse).status()).toBe(201);

  await expect(page.getByText("Оставить отзыв")).not.toBeVisible();
});

test("admin can login", async ({ page }) => {
  await page.goto("/admin");

  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Пароль").fill("PlaywrightPass123");

  const loginResponse = page.waitForResponse((response) =>
    response.url().includes("/api/admin/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Войти" }).click();
  expect((await loginResponse).status()).toBe(200);

  await page.reload();
  await expect(page.getByRole("button", { name: "Выйти" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Одобренные/i })).toBeVisible();
});
