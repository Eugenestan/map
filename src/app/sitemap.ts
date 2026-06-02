import type { MetadataRoute } from "next";
import { getArticles } from "@/services/articles";
import { getCategories } from "@/services/categories";
import { getPlaces } from "@/services/places";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  const [placesResult, articlesResult, categoriesResult] = await Promise.allSettled([
    getPlaces({ limit: 1000 }),
    getArticles({ limit: 1000 }),
    getCategories(),
  ]);

  const placeRoutes: MetadataRoute.Sitemap =
    placesResult.status === "fulfilled"
      ? placesResult.value.map((place) => ({
          url: `${SITE_URL}/place/${place.id}`,
          lastModified: place.last_verified_at ? new Date(place.last_verified_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }))
      : [];

  const articleRoutes: MetadataRoute.Sitemap =
    articlesResult.status === "fulfilled"
      ? articlesResult.value.map((article) => ({
          url: `${SITE_URL}/articles/${article.slug}`,
          lastModified: new Date(article.updated_at || article.created_at),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        }))
      : [];

  const categoryRoutes: MetadataRoute.Sitemap =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.map((category) => ({
          url: `${SITE_URL}/category/${category.slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.75,
        }))
      : [];

  return [...staticRoutes, ...categoryRoutes, ...placeRoutes, ...articleRoutes];
}
