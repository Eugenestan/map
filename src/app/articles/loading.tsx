import { Header } from "@/components/ui/header";

export default function ArticlesLoading() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Гид по Нячангу</p>
            <h1 className="mt-1 text-3xl font-bold text-zinc-900">Все места</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">Загружаем подборки и материалы...</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="h-10 animate-pulse rounded-xl bg-zinc-100" />
            <div className="mt-4 h-10 animate-pulse rounded-xl bg-zinc-100" />
            <div className="mt-4 h-10 animate-pulse rounded-xl bg-blue-100" />
            <div className="mt-5 space-y-2 border-t border-zinc-100 pt-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-9 animate-pulse rounded-xl bg-zinc-100" />
              ))}
            </div>
          </aside>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="h-44 animate-pulse bg-zinc-100" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
                  <div className="h-5 animate-pulse rounded bg-zinc-100" />
                  <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
