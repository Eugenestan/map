import { expect, test } from "@playwright/test";

test("homepage loads with search and places list", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByPlaceholder("Поиск мест...").first()).toBeVisible();
  await expect(page.getByText("Добавить место")).toBeVisible();
});
