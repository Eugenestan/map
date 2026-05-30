import Link from "next/link";
import type { Metadata } from "next";
import { ArticlesFilters } from "@/components/features/articles/articles-filters";
import { Header } from "@/components/ui/header";
import { TagBadge } from "@/components/ui/tag-badge";
import { JsonLd } from "@/components/ui/json-ld";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { getArticles } from "@/services/articles";
import { getPlaceListItems } from "@/services/places";
import { getTags } from "@/services/tags";

export const metadata: Metadata = {
  title: "Интересные места Нячанга",
  description: "Подборки, обзоры и полезные материалы о местах Нячанга для русскоязычных туристов и экспатов.",
  alternates: { canonical: `${SITE_URL}/articles` },
  openGraph: {
    title: "Интересные места Нячанга",
    description: "Подборки и полезные материалы о местах Нячанга на Русской карте.",
    url: `${SITE_URL}/articles`,
    siteName: SITE_NAME,
    locale: "ru_RU",
    type: "website",
  },
};

type ArticlesSearchParams = Promise<{
  q?: string;
  place?: string;
  tags?: string | string[];
}>;

function getMany(value?: string | string[]): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean);
}

export default async function ArticlesPage({ searchParams }: { searchParams: ArticlesSearchParams }) {
  const params = await searchParams;
  const search = params.q?.trim() || "";
  const selectedPlace = params.place?.trim() || "";
  const selectedTags = getMany(params.tags);

  const [articles, places, tags] = await Promise.all([
    getArticles({ search, placeId: selectedPlace, tagIds: selectedTags, limit: 100 }),
    getPlaceListItems(500),
    getTags(),
  ]);

  const placeMap = new Map(places.map((place) => [place.id, place]));
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
  const hasFilters = Boolean(search || selectedPlace || selectedTags.length);

  return (
    <div className="min-h-screen bg-zinc-50">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Интересные места Нячанга",
          url: `${SITE_URL}/articles`,
          inLanguage: "ru",
          description: SITE_DESCRIPTION,
        }}
      />
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Гид по Нячангу</p>
            <h1 className="mt-1 text-3xl font-bold text-zinc-900">Все места</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Подборки и материалы о местах на карте. Используйте поиск, место и теги, чтобы найти нужное место.
            </p>
          </div>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Вернуться к карте
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <ArticlesFilters
            search={search}
            selectedPlace={selectedPlace}
            selectedTags={selectedTags}
            places={places}
            tags={tags}
            articlesCount={articles.length}
            hasFilters={hasFilters}
          />

          <section>
            {articles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
                <h2 className="text-lg font-semibold text-zinc-900">Места не найдены</h2>
                <p className="mt-2 text-sm text-zinc-500">Попробуйте изменить место, теги или текст поиска.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {articles.map((article) => {
                  const place = article.place_id ? placeMap.get(article.place_id) : null;
                  const articleTags = article.tag_ids.map((tagId) => tagMap.get(tagId)).filter(Boolean);
                  return (
                    <Link
                      key={article.id}
                      href={`/articles/${article.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    >
                      {article.photo_urls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={article.photo_urls[0]} alt={article.title} className="h-44 w-full object-cover" />
                      ) : (
                        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-blue-50 to-zinc-100 text-sm font-medium text-zinc-400">
                          Русская карта Нячанга
                        </div>
                      )}
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                          <span>{new Date(article.created_at).toLocaleDateString("ru")}</span>
                          {place && <span className="truncate">{place.title}</span>}
                        </div>
                        <h2 className="mt-2 text-lg font-semibold text-zinc-900 group-hover:text-blue-700">{article.title}</h2>
                        <p className="mt-2 line-clamp-3 text-sm text-zinc-600">{article.description}</p>
                        {articleTags.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {articleTags.slice(0, 4).map((tag) => tag && <TagBadge key={tag.id} label={tag.name_ru} type={tag.tag_type} />)}
                          </div>
                        )}
                        <span className="mt-auto pt-4 text-sm font-medium text-blue-600">Открыть место</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
