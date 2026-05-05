import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/ui/header";
import { getArticleBySlug } from "@/services/articles";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

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
      </main>
    </div>
  );
}
