import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticlesFilters } from "@/components/features/articles/articles-filters";
import { Header } from "@/components/ui/header";
import { TagBadge } from "@/components/ui/tag-badge";
import { JsonLd } from "@/components/ui/json-ld";
import { FormattedText } from "@/components/ui/formatted-text";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { countArticles, getArticles } from "@/services/articles";
import { getCategories } from "@/services/categories";
import { getPlaceListItems } from "@/services/places";
import { getTags } from "@/services/tags";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 10;

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
  category?: string;
  tags?: string | string[];
  page?: string;
}>;

function getMany(value?: string | string[]): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePage(value?: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function buildPageUrl(
  page: number,
  params: { q: string; place: string; category: string; tags: string[] },
): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.place) sp.set("place", params.place);
  if (params.category) sp.set("category", params.category);
  params.tags.forEach((tag) => sp.append("tags", tag));
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `/articles?${qs}` : "/articles";
}

function getPageList(current: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push("ellipsis");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

export default async function ArticlesPage({ searchParams }: { searchParams: ArticlesSearchParams }) {
  const params = await searchParams;
  const search = params.q?.trim() || "";
  const selectedPlace = params.place?.trim() || "";
  const selectedCategory = params.category?.trim() || "";
  const selectedTags = getMany(params.tags);
  const page = parsePage(params.page);
  const offset = (page - 1) * PAGE_SIZE;

  const baseFilters = {
    search,
    placeId: selectedPlace,
    categoryId: selectedCategory,
    tagIds: selectedTags,
  };

  const [articles, totalCount, places, tags, categories] = await Promise.all([
    getArticles({ ...baseFilters, limit: PAGE_SIZE, offset }),
    countArticles(baseFilters),
    getPlaceListItems(500),
    getTags(),
    getCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const placeMap = new Map(places.map((place) => [place.id, place]));
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
  const hasFilters = Boolean(search || selectedPlace || selectedCategory || selectedTags.length);
  const urlParams = {
    q: search,
    place: selectedPlace,
    category: selectedCategory,
    tags: selectedTags,
  };
  const pageList = getPageList(safePage, totalPages);
  const filtersKey = `${search}|${selectedPlace}|${selectedCategory}|${selectedTags.join(",")}`;

  return (
    <div className="min-h-screen bg-[#e8f2e1]">
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
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Гид по Нячангу</p>
            <h1 className="mt-1 text-3xl font-bold text-zinc-900">Все места</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Здесь собрана информация о самых интересных местах Нячанга
            </p>
          </div>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Вернуться к карте
          </Link>
        </div>

        <div className="mb-6">
          <ArticlesFilters
            key={filtersKey}
            search={search}
            selectedPlace={selectedPlace}
            selectedCategory={selectedCategory}
            selectedTags={selectedTags}
            places={places}
            categories={categories}
            tags={tags}
            totalCount={totalCount}
            hasFilters={hasFilters}
          />
        </div>

        <section>
          {articles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <h2 className="text-lg font-semibold text-zinc-900">Места не найдены</h2>
              <p className="mt-2 text-sm text-zinc-500">Попробуйте изменить место, теги или текст поиска.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {articles.map((article) => {
                const place = article.place_id ? placeMap.get(article.place_id) : null;
                const articleTags = article.tag_ids.map((tagId) => tagMap.get(tagId)).filter(Boolean);
                return (
                  <Link
                    key={article.id}
                    href={`/articles/${article.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:flex-row"
                  >
                    {article.photo_urls[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.photo_urls[0]}
                        alt={article.title}
                        className="h-48 w-full flex-shrink-0 object-cover sm:h-auto sm:w-56 md:w-64"
                      />
                    ) : (
                      <div className="flex h-48 w-full flex-shrink-0 items-center justify-center bg-gradient-to-br from-blue-50 to-zinc-100 text-sm font-medium text-zinc-400 sm:h-auto sm:w-56 md:w-64">
                        Русская карта Нячанга
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                        <span>{new Date(article.created_at).toLocaleDateString("ru")}</span>
                        {place && <span className="truncate">{place.title}</span>}
                      </div>
                      <h2 className="mt-2 text-xl font-semibold text-zinc-900 group-hover:text-blue-700">
                        {article.title}
                      </h2>
                      <FormattedText
                        text={article.description}
                        className="mt-2 line-clamp-3 text-sm text-zinc-600"
                      />
                      {articleTags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {articleTags.slice(0, 6).map(
                            (tag) => tag && <TagBadge key={tag.id} label={tag.name_ru} type={tag.tag_type} />,
                          )}
                        </div>
                      )}
                      <span className="mt-auto pt-4 text-sm font-medium text-blue-600">Открыть место</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
              aria-label="Навигация по страницам"
            >
              <PageLink
                href={buildPageUrl(safePage - 1, urlParams)}
                disabled={safePage <= 1}
                ariaLabel="Предыдущая страница"
              >
                <ChevronLeft className="h-4 w-4" />
              </PageLink>

              {pageList.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 text-sm text-zinc-400"
                    aria-hidden="true"
                  >
                    …
                  </span>
                ) : (
                  <PageLink
                    key={item}
                    href={buildPageUrl(item, urlParams)}
                    active={item === safePage}
                  >
                    {item}
                  </PageLink>
                ),
              )}

              <PageLink
                href={buildPageUrl(safePage + 1, urlParams)}
                disabled={safePage >= totalPages}
                ariaLabel="Следующая страница"
              >
                <ChevronRight className="h-4 w-4" />
              </PageLink>
            </nav>
          )}
        </section>
      </main>
    </div>
  );
}

interface PageLinkProps {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

function PageLink({ href, children, active, disabled, ariaLabel }: PageLinkProps) {
  const className = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors",
    active
      ? "border-blue-600 bg-blue-600 text-white"
      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled) {
    return (
      <span className={className} aria-disabled="true" aria-label={ariaLabel}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
