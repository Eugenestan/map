import { expect, test } from "@playwright/test";

test("user can submit a review in anti-bot bypass mode", async ({ page }) => {
  await page.goto("/place/place-1");

  await page.getByRole("button", { name: "Отзыв" }).click();
  await page.getByPlaceholder("Поделитесь своим опытом...").fill("Проверка smoke-сценария через Playwright.");
  await page.getByPlaceholder("Необязательно").fill("Playwright");
  await page.getByRole("button", { name: "Отправить отзыв" }).click();

  await expect(page.getByText("Оставить отзыв")).not.toBeVisible();
});

test("admin can login", async ({ page }) => {
  await page.goto("/admin");

  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Пароль").fill("PlaywrightPass123");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByText("Модерация")).toBeVisible();
});
