import { Header } from "@/components/ui/header";

export default function ArticlesLoading() {
  return (
    <div className="min-h-screen bg-[#e8f2e1]">
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
        </div>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="h-11 flex-1 animate-pulse rounded-xl bg-zinc-100" />
          <div className="flex flex-row gap-2 sm:w-36 sm:flex-col">
            <div className="h-11 flex-1 animate-pulse rounded-xl bg-blue-100 sm:flex-none" />
            <div className="h-11 flex-1 animate-pulse rounded-xl bg-zinc-100 sm:flex-none" />
          </div>
        </div>

        <section className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:flex-row"
            >
              <div className="h-48 w-full flex-shrink-0 animate-pulse bg-zinc-100 sm:h-auto sm:w-56 md:w-64" />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
                <div className="h-6 w-3/4 animate-pulse rounded bg-zinc-100" />
                <div className="h-4 animate-pulse rounded bg-zinc-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
                <div className="mt-2 flex gap-1.5">
                  <div className="h-5 w-20 animate-pulse rounded-full bg-zinc-100" />
                  <div className="h-5 w-24 animate-pulse rounded-full bg-zinc-100" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100" />
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
