import { beforeEach, describe, expect, it } from "vitest";
import { createArticle, getArticleById, getArticles, getRelatedArticles } from "@/services/articles";

const baseArticle = {
  photo_urls: [],
  lat: 12.24,
  lng: 109.19,
};

async function addArticle(data: {
  title: string;
  description: string;
  tag_ids: string[];
  place_id?: string;
}) {
  const result = await createArticle({
    ...baseArticle,
    ...data,
  });
  const article = await getArticleById(result.id);
  if (!article) {
    throw new Error("Article was not created in dev store");
  }
  return article;
}

describe("articles service", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "";
    global.__nhatrangDevStore__ = undefined;
  });

  it("filters public articles by search, place and all selected tags", async () => {
    await addArticle({
      title: "Клиника для туристов",
      description: "Русскоязычные врачи в центре Нячанга",
      tag_ids: ["tag-1", "tag-2"],
      place_id: "place-1",
    });
    await addArticle({
      title: "Где есть борщ",
      description: "Ресторан с русским меню и семейными столами",
      tag_ids: ["tag-2", "tag-3"],
      place_id: "place-2",
    });
    await addArticle({
      title: "Семейная прогулка",
      description: "Маршрут без привязки к заведению",
      tag_ids: ["tag-8"],
    });

    await expect(getArticles({ placeId: "place-1" })).resolves.toMatchObject([
      { title: "Клиника для туристов" },
    ]);
    await expect(getArticles({ search: "борщ" })).resolves.toMatchObject([
      { title: "Где есть борщ" },
    ]);
    await expect(getArticles({ tagIds: ["tag-2", "tag-3"] })).resolves.toMatchObject([
      { title: "Где есть борщ" },
    ]);
  });

  it("returns related articles by same place before tag matches and then falls back to latest", async () => {
    const current = await addArticle({
      title: "Главная статья",
      description: "Материал про проверенное место",
      tag_ids: ["tag-1"],
      place_id: "place-1",
    });
    await addArticle({
      title: "То же место",
      description: "Связанная статья по месту",
      tag_ids: ["tag-17"],
      place_id: "place-1",
    });
    await addArticle({
      title: "Похожий тег",
      description: "Связанная статья по тегу",
      tag_ids: ["tag-1"],
      place_id: "place-2",
    });
    await addArticle({
      title: "Свежая запасная",
      description: "Попадает в fallback, если похожих меньше лимита",
      tag_ids: ["tag-22"],
      place_id: "place-3",
    });

    const related = await getRelatedArticles(current, 3);

    expect(related.map((article) => article.title)).toEqual([
      "То же место",
      "Похожий тег",
      "Свежая запасная",
    ]);
  });
});
