import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/ui/header";
import { JsonLd } from "@/components/ui/json-ld";
import { getArticleBySlug, getRelatedArticles } from "@/services/articles";
import { getPlaceById } from "@/services/places";
import { getReviewsByPlace } from "@/services/reviews";
import { getTags } from "@/services/tags";
import { TagBadge } from "@/components/ui/tag-badge";
import { FormattedText, stripArticleFormatting } from "@/components/ui/formatted-text";
import { getPlacePath } from "@/lib/place-url";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) return {};

  const plainDescription = stripArticleFormatting(article.description);
  const description = plainDescription.length > 155 ? `${plainDescription.slice(0, 152)}...` : plainDescription;
  const image = article.photo_urls[0] ? absoluteUrl(article.photo_urls[0]) : `${SITE_URL}/og-image.png`;

  return {
    title: article.title,
    description,
    alternates: { canonical: `${SITE_URL}/articles/${article.slug}` },
    openGraph: {
      title: article.title,
      description,
      url: `${SITE_URL}/articles/${article.slug}`,
      siteName: SITE_NAME,
      locale: "ru_RU",
      type: "article",
      images: [{ url: image, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [image],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const [placeReviews, relatedArticles, tags, place] = await Promise.all([
    article.place_id ? getReviewsByPlace(article.place_id) : [],
    getRelatedArticles(article, 3),
    getTags(),
    article.place_id ? getPlaceById(article.place_id) : null,
  ]);
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
  const articleTags = article.tag_ids.map((tagId) => tagMap.get(tagId)).filter(Boolean);
  const plainDescription = stripArticleFormatting(article.description);

  return (
    <div className="min-h-screen bg-zinc-50">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: plainDescription,
          image: article.photo_urls.length > 0 ? article.photo_urls.map(absoluteUrl) : [`${SITE_URL}/og-image.png`],
          datePublished: article.created_at,
          dateModified: article.updated_at,
          inLanguage: "ru",
          mainEntityOfPage: `${SITE_URL}/articles/${article.slug}`,
          publisher: {
            "@type": "Organization",
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
            { "@type": "ListItem", position: 2, name: "Интересные места", item: `${SITE_URL}/articles` },
            { "@type": "ListItem", position: 3, name: article.title, item: `${SITE_URL}/articles/${article.slug}` },
          ],
        }}
      />
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-8">
          <h1 className="text-2xl font-bold text-zinc-900 md:text-3xl">{article.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{new Date(article.created_at).toLocaleDateString("ru")}</span>
            {place && (
              <>
                <span>•</span>
                <Link href={getPlacePath(place)} className="font-medium text-blue-600 hover:text-blue-700">
                  {place.title}
                </Link>
              </>
            )}
          </div>
          {articleTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {articleTags.map((tag) => tag && <TagBadge key={tag.id} label={tag.name_ru} type={tag.tag_type} />)}
            </div>
          )}
          <FormattedText text={article.description} className="mt-4 whitespace-pre-line text-zinc-700" />

          {article.photo_urls.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {article.photo_urls.map((url, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${url}-${index}`}
                  src={url}
                  alt={`${article.title} фото ${index + 1}`}
                  className="h-48 w-full rounded-xl border border-zinc-200 object-cover"
                />
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 text-sm text-zinc-500">
            <span>
              Координаты: {article.lat.toFixed(5)}, {article.lng.toFixed(5)}
            </span>
            <Link href="/" className="font-medium text-blue-600 hover:text-blue-700">
              Вернуться к карте
            </Link>
          </div>
        </article>

        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Читайте также</h2>
            <Link href="/articles" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Все места
            </Link>
          </div>

          {relatedArticles.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Других мест пока нет.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {relatedArticles.map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  href={`/articles/${relatedArticle.slug}`}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 transition hover:border-blue-200 hover:bg-blue-50/60"
                >
                  <h3 className="text-sm font-semibold text-zinc-900">{relatedArticle.title}</h3>
                  <FormattedText text={relatedArticle.description} className="mt-1 line-clamp-2 text-sm text-zinc-600" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {article.place_id && (
          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 md:p-8">
            <h2 className="text-lg font-semibold text-zinc-900">
              Отзывы об этом месте
              {placeReviews.length > 0 && <span className="ml-2 text-sm font-normal text-zinc-500">({placeReviews.length})</span>}
            </h2>

            {placeReviews.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Пока нет одобренных отзывов.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {placeReviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-800">{review.author_name || "Аноним"}</p>
                      <p className="text-xs text-zinc-400">
                        {review.visit_period || new Date(review.created_at).toLocaleDateString("ru")}
                      </p>
                    </div>
                    {review.text.trim() && <p className="mt-1 text-sm text-zinc-700">{review.text}</p>}
                    {review.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {review.tags.map((tag) => (
                          <TagBadge key={tag.id} label={tag.name_ru} type={tag.tag_type} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
