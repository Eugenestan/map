import { getArticles } from "@/services/articles";
import { getCategories } from "@/services/categories";
import { getPlaces } from "@/services/places";
import { execute, isDatabaseConfigured, normalizeTimestamp } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

type ChangeFrequency = "daily" | "weekly" | "monthly";

interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency: ChangeFrequency;
  priority: number;
}

interface ArticleSitemapRow {
  slug: string;
  created_at: string | Date;
  updated_at: string | Date;
}

interface PlaceSitemapRow {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  last_verified_at: string | Date | null;
}

const baseUrl = SITE_URL.replace(/\/+$/, "");

function toSafeDate(value: unknown): Date {
  const normalized = normalizeTimestamp(value);
  const date = normalized ? new Date(normalized) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function getArticleRoutes(): Promise<SitemapEntry[]> {
  if (isDatabaseConfigured()) {
    const rows = await execute<ArticleSitemapRow>(
      `
      SELECT slug, created_at, updated_at
      FROM articles
      ORDER BY created_at DESC
      LIMIT 1000
    `,
    );

    return rows.map((article) => ({
      url: `${baseUrl}/articles/${encodeURIComponent(article.slug)}`,
      lastModified: toSafeDate(article.updated_at || article.created_at),
      changeFrequency: "monthly",
      priority: 0.7,
    }));
  }

  const articles = await getArticles({ limit: 1000 });
  return articles.map((article) => ({
    url: `${baseUrl}/articles/${encodeURIComponent(article.slug)}`,
    lastModified: toSafeDate(article.updated_at || article.created_at),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
}

async function getPlaceRoutes(): Promise<SitemapEntry[]> {
  if (isDatabaseConfigured()) {
    const rows = await execute<PlaceSitemapRow>(
      `
      SELECT id, created_at, updated_at, last_verified_at
      FROM places
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT 1000
    `,
    );

    return rows.map((place) => ({
      url: `${baseUrl}/place/${encodeURIComponent(place.id)}`,
      lastModified: toSafeDate(place.last_verified_at || place.updated_at || place.created_at),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  }

  const places = await getPlaces({ limit: 1000 });
  return places.map((place) => ({
    url: `${baseUrl}/place/${encodeURIComponent(place.id)}`,
    lastModified: toSafeDate(place.last_verified_at || place.updated_at || place.created_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));
}

async function getCategoryRoutes(): Promise<SitemapEntry[]> {
  const categories = await getCategories();
  return categories.map((category) => ({
    url: `${baseUrl}/category/${encodeURIComponent(category.slug)}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.75,
  }));
}

function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(2)}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export async function GET() {
  const staticRoutes: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  const [categoryRoutes, placeRoutes, articleRoutes] = await Promise.allSettled([
    getCategoryRoutes(),
    getPlaceRoutes(),
    getArticleRoutes(),
  ]);

  const entries = [
    ...staticRoutes,
    ...(categoryRoutes.status === "fulfilled" ? categoryRoutes.value : []),
    ...(placeRoutes.status === "fulfilled" ? placeRoutes.value : []),
    ...(articleRoutes.status === "fulfilled" ? articleRoutes.value : []),
  ];

  return new Response(renderSitemap(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}
