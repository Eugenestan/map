import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/ui/header";
import { JsonLd } from "@/components/ui/json-ld";
import { TagBadge } from "@/components/ui/tag-badge";
import { CATEGORIES } from "@/data/seed";
import { getCategories } from "@/services/categories";
import { getPlaces } from "@/services/places";
import { getPlacePath } from "@/lib/place-url";
import { getCategorySeo, SITE_NAME, SITE_URL } from "@/lib/seo";
import type { Category } from "@/types";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const categories = await getCategories();
    return categories.find((category) => category.slug === slug) ?? null;
  } catch {
    return CATEGORIES.find((category) => category.slug === slug) ?? null;
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const seo = getCategorySeo(category);
  const url = `${SITE_URL}/category/${category.slug}`;

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url,
      siteName: SITE_NAME,
      locale: "ru_RU",
      type: "website",
      images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: seo.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const seo = getCategorySeo(category);
  const places = await getPlaces({ category: category.id, limit: 100 }).catch(() => []);
  const url = `${SITE_URL}/category/${category.slug}`;

  return (
    <div className="min-h-screen bg-zinc-50">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: seo.title,
          description: seo.description,
          url,
          inLanguage: "ru",
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
            { "@type": "ListItem", position: 2, name: category.name_ru, item: url },
          ],
        }}
      />
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Вернуться к карте
        </Link>

        <section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-medium text-blue-600">{category.icon} {category.name_ru}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">{seo.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600">{seo.intro}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {seo.keywords.map((keyword) => (
              <span key={keyword} className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
                {keyword}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">Места на карте</h2>
              <p className="mt-1 text-sm text-zinc-500">Всего в категории: {places.length}</p>
            </div>
            <Link href="/" className="hidden text-sm font-medium text-blue-600 hover:text-blue-700 sm:inline">
              Открыть интерактивную карту
            </Link>
          </div>

          {places.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <h3 className="text-lg font-semibold text-zinc-900">Пока нет опубликованных мест</h3>
              <p className="mt-2 text-sm text-zinc-500">Категория уже доступна для индексации и будет наполняться после модерации мест.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {places.map((place) => (
                <Link
                  key={place.id}
                  href={getPlacePath(place)}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">{place.title}</h3>
                      {place.address_text && <p className="mt-1 text-sm text-zinc-500">{place.address_text}</p>}
                    </div>
                    {place.is_verified && <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Проверено</span>}
                  </div>
                  {place.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">{place.description}</p>}
                  {place.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {place.tags.slice(0, 5).map((tag) => (
                        <TagBadge key={tag.id} label={tag.tag.name_ru} type={tag.tag.tag_type} />
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
