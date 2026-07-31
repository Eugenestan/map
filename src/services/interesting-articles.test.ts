import { beforeEach, describe, expect, it } from "vitest";
import {
  createInterestingArticleCategorySchema,
  createInterestingArticleSchema,
  updateInterestingArticleSchema,
} from "@/schemas";
import {
  createInterestingArticleCategory,
  deleteInterestingArticleCategory,
  updateInterestingArticleCategory,
} from "@/services/interesting-article-categories";
import {
  createInterestingArticle,
  getInterestingArticlesForAdmin,
  getPublishedInterestingArticleBySlug,
  getPublishedInterestingArticles,
  getPublishedInterestingArticlesByPlace,
  InterestingArticleReferenceError,
  sanitizeInterestingArticleHtml,
  updateInterestingArticle,
} from "@/services/interesting-articles";

async function addCategory(name_ru = "Маршруты") {
  return createInterestingArticleCategory(
    createInterestingArticleCategorySchema.parse({ name_ru }),
  );
}

async function addArticle(categoryId: string, overrides: Record<string, unknown> = {}) {
  return createInterestingArticle(
    createInterestingArticleSchema.parse({
      category_id: categoryId,
      status: "published",
      title: "Прогулка по Нячангу",
      excerpt: "Короткий анонс интересного маршрута",
      content_html: "<p>Подробный текст статьи с полезными рекомендациями для прогулки.</p>",
      ...overrides,
    }),
  );
}

describe("interesting articles schemas and dev-store services", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "";
    global.__nhatrangDevStore__ = undefined;
  });

  it("validates create and partial update payloads", () => {
    expect(createInterestingArticleSchema.safeParse({ title: "Без остальных полей" }).success).toBe(false);
    expect(updateInterestingArticleSchema.safeParse({}).success).toBe(false);
    expect(updateInterestingArticleSchema.safeParse({ status: "published" }).success).toBe(true);
    expect(updateInterestingArticleSchema.safeParse({ slug: "Плохой slug" }).success).toBe(false);
  });

  it("returns only published articles publicly and supports filters and pagination", async () => {
    const category = await addCategory();
    await addArticle(category.id, { title: "Острова Нячанга", place_ids: ["place-1"] });
    await addArticle(category.id, {
      status: "draft",
      title: "Черновой маршрут",
      place_ids: ["place-1"],
    });
    await addArticle(category.id, { title: "Кофейни центра", place_ids: ["place-2"] });

    const publicResult = await getPublishedInterestingArticles({ search: "Нячанга", limit: 1 });
    expect(publicResult.total).toBe(1);
    expect(publicResult.data[0].title).toBe("Острова Нячанга");
    await expect(getPublishedInterestingArticlesByPlace("place-1")).resolves.toMatchObject({
      total: 1,
      data: [{ title: "Острова Нячанга" }],
    });
    await expect(getInterestingArticlesForAdmin({ status: "draft" })).resolves.toMatchObject({
      total: 1,
      data: [{ title: "Черновой маршрут" }],
    });
  });

  it("creates unique slugs and publishes a draft on update", async () => {
    const category = await addCategory();
    const first = await addArticle(category.id, { title: "Один заголовок" });
    const second = await addArticle(category.id, { title: "Один заголовок" });
    expect(first.slug).toBe("odin-zagolovok");
    expect(second.slug).toBe("odin-zagolovok-2");

    const draft = await addArticle(category.id, { status: "draft", title: "Будущая статья" });
    expect(await getPublishedInterestingArticleBySlug(draft.slug)).toBeNull();
    const published = await updateInterestingArticle(draft.id, { status: "published" });
    expect(published?.published_at).toBeTruthy();
    expect(await getPublishedInterestingArticleBySlug(draft.slug)).not.toBeNull();

    const unpublished = await updateInterestingArticle(draft.id, { status: "draft" });
    expect(unpublished?.published_at).toBeNull();
    expect(await getPublishedInterestingArticleBySlug(draft.slug)).toBeNull();
  });

  it("validates referenced categories and places", async () => {
    const category = await addCategory();
    const article = await addArticle(category.id);
    expect(article.category.id).toBe(category.id);

    await expect(addArticle("missing-category")).rejects.toBeInstanceOf(InterestingArticleReferenceError);
    await expect(addArticle(category.id, { place_ids: ["missing-place"] })).rejects.toThrow(
      "Места не найдены: missing-place",
    );
  });

  it("hides articles from inactive categories in public results", async () => {
    const category = await addCategory();
    await addArticle(category.id);
    await updateInterestingArticleCategory(category.id, { is_active: false });

    await expect(getPublishedInterestingArticles()).resolves.toMatchObject({ total: 0, data: [] });
    await expect(getInterestingArticlesForAdmin()).resolves.toMatchObject({ total: 1 });
  });

  it("prevents deleting a category referenced by an article", async () => {
    const category = await addCategory();
    await addArticle(category.id);
    await expect(deleteInterestingArticleCategory(category.id)).resolves.toBe("in_use");
  });

  it("sanitizes article HTML with a safe allowlist", async () => {
    expect(
      sanitizeInterestingArticleHtml(
        '<p onclick="alert(1)">Текст</p><script>alert(1)</script><a href="javascript:alert(1)">ссылка</a>',
      ),
    ).toBe("<p>Текст</p><a>ссылка</a>");

    const category = await addCategory();
    const article = await addArticle(category.id, {
      content_html: '<p>Безопасный текст статьи</p><img src="https://example.com/image.jpg" onerror="alert(1)">',
      seo_keywords: ["нячанг", "маршрут", "нячанг"],
    });
    expect(article.content_html).not.toContain("onerror");
    expect(article.seo_keywords).toEqual(["нячанг", "маршрут"]);
  });
});
