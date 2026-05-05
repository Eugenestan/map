import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/ui/header";
import { getArticleBySlug } from "@/services/articles";
import { getReviewsByPlace } from "@/services/reviews";
import { TagBadge } from "@/components/ui/tag-badge";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const placeReviews = article.place_id ? await getReviewsByPlace(article.place_id) : [];

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 md:p-8">
          <h1 className="text-2xl font-bold text-zinc-900 md:text-3xl">{article.title}</h1>
          <p className="mt-4 whitespace-pre-line text-zinc-700">{article.description}</p>

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
