"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import type { PlaceWithDetails, Category, Tag } from "@/types";
import { Header } from "@/components/ui/header";
import { SearchBar } from "@/components/ui/search-bar";
import { PlaceCardSmall } from "@/components/features/places/place-card-small";
import { PlaceCardFull } from "@/components/features/places/place-card-full";
import { FiltersPanel } from "@/components/features/filters/filters-panel";
import { AddPlaceForm } from "@/components/features/forms/add-place-form";
import { AddReviewForm } from "@/components/features/forms/add-review-form";
import { ReportForm } from "@/components/features/forms/report-form";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { PlaceCardSkeleton } from "@/components/ui/loading-skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import type { AddPlaceInput } from "@/schemas";
import { CATEGORIES } from "@/data/seed";
import { Plus, SlidersHorizontal, List, X } from "lucide-react";
import { cn } from "@/lib/cn";

const MapView = dynamic(
  () => import("@/components/features/map/map-view").then((m) => m.MapView),
  { ssr: false, loading: () => <div className="flex-1 bg-zinc-100 flex items-center justify-center text-zinc-400">Загрузка карты...</div> },
);

type ModalType = "place-detail" | "add-place" | "add-review" | "report" | "filters" | null;

const HOME_SEO_CATEGORIES = CATEGORIES.filter((category) =>
  ["doctor", "pharmacy", "food", "exchange", "guide", "beauty", "danger", "landmarks"].includes(category.slug),
);

export default function HomePage() {
  const [places, setPlaces] = useState<PlaceWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [hasReviewsOnly, setHasReviewsOnly] = useState(false);
  const [recommendedLayerOn, setRecommendedLayerOn] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithDetails | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [pickMode, setPickMode] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<[number, number] | null>(null);
  const [placeFormDraft, setPlaceFormDraft] = useState<Partial<AddPlaceInput>>({});
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.data || []));
    fetch("/api/tags").then((r) => r.json()).then((d) => setTags(d.data || []));
  }, []);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (verifiedOnly) params.set("verifiedOnly", "true");
    if (hasReviewsOnly) params.set("hasReviewsOnly", "true");

    try {
      const res = await fetch(`/api/places?${params}`);
      const data = await res.json();
      setPlaces(data.data || []);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedTags, verifiedOnly, hasReviewsOnly]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const handlePlaceClick = (place: PlaceWithDetails) => {
    setSelectedPlace(place);
    setActiveModal("place-detail");
    setFlyTo([place.lat, place.lng]);
  };

  const handleAddPlace = () => {
    setPickedLocation(null);
    setPlaceFormDraft({});
    setActiveModal("add-place");
  };

  const handlePick = (lat: number, lng: number) => {
    setPickedLocation([lat, lng]);
    setFlyTo([lat, lng]);
    setPickMode(false);
    setActiveModal("add-place");
  };

  const handleManualCoordinatesChange = (lat: number, lng: number) => {
    setPickedLocation([lat, lng]);
    setFlyTo([lat, lng]);
  };

  const handleAddPlaceSubmit = async (data: AddPlaceInput, meta?: { turnstileToken?: string | null }) => {
    const res = await fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, turnstileToken: meta?.turnstileToken ?? null }),
    });
    if (res.ok) {
      setPickMode(false);
      setPickedLocation(null);
      setPlaceFormDraft({});
      fetchPlaces();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    };
    const fieldMsgs = body.details?.fieldErrors
      ? Object.values(body.details.fieldErrors).flat().filter(Boolean)
      : [];
    const parts = [body.error, ...fieldMsgs, ...(body.details?.formErrors || [])].filter(Boolean);
    throw new Error(parts.length > 0 ? parts.join(" ") : "Не удалось отправить место");
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
    setVerifiedOnly(false);
    setHasReviewsOnly(false);
    setSearch("");
  };

  const closeModal = (cancelPick = true) => {
    if (activeModal === "add-place" && cancelPick) {
      setPlaceFormDraft({});
    }
    setActiveModal(null);
    if (cancelPick && pickMode) {
      setPickMode(false);
      setPickedLocation(null);
    }
  };

  const mapPlaces = recommendedLayerOn
    ? places.filter((place) => place.admin_recommended)
    : places;

  return (
    <>
      <div className="flex min-h-0 h-dvh flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-[380px] lg:w-[420px] flex-col border-r border-zinc-200 bg-white">
          {/* Search — always visible at top */}
          <div className="p-3 border-b border-zinc-100 flex-shrink-0">
            <SearchBar value={search} onChange={setSearch} />
          </div>

          {/* Filters + places list — scrollable middle area */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-3 border-b border-zinc-100">
              <FiltersPanel
                categories={categories}
                tags={tags}
                selectedCategory={selectedCategory}
                selectedTags={selectedTags}
                verifiedOnly={verifiedOnly}
                hasReviewsOnly={hasReviewsOnly}
                onCategoryChange={setSelectedCategory}
                onTagToggle={handleTagToggle}
                onVerifiedToggle={() => setVerifiedOnly(!verifiedOnly)}
                onHasReviewsToggle={() => setHasReviewsOnly(!hasReviewsOnly)}
                onReset={handleResetFilters}
              />
            </div>

            <div className="p-3 space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <PlaceCardSkeleton key={i} />)
              ) : places.length === 0 ? (
                <EmptyState type="no-results" />
              ) : (
                places.map((place) => (
                  <PlaceCardSmall
                    key={place.id}
                    place={place}
                    onClick={() => handlePlaceClick(place)}
                    active={selectedPlace?.id === place.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* "Add place" button — always pinned at the bottom */}
          <div className="p-3 border-t border-zinc-100 flex-shrink-0">
            <button
              onClick={handleAddPlace}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Добавить место
            </button>
          </div>
        </aside>

        {/* Map area */}
        <div className="flex-1 relative">
          {/* Mobile top bar */}
          <div className="md:hidden absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2">
            <SearchBar value={search} onChange={setSearch} className="shadow-lg" />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setRecommendedLayerOn(!recommendedLayerOn)}
                className={cn(
                  "text-xs font-medium rounded-full border px-3 py-1.5 shadow-md backdrop-blur-sm transition-colors",
                  recommendedLayerOn
                    ? "border-amber-300 bg-amber-100/95 text-amber-900"
                    : "border-zinc-200 bg-white/95 text-zinc-500",
                )}
              >
                ⭐ Рекомендуют
              </button>
            </div>
          </div>

          <MapView
            places={mapPlaces}
            onPlaceClick={handlePlaceClick}
            pickMode={pickMode}
            onPick={handlePick}
            pickedLocation={pickedLocation}
            flyTo={flyTo}
            highlightRecommended={recommendedLayerOn}
            locateButtonClassName="bottom-[calc(max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))+11.75rem)] md:bottom-24"
            className="w-full h-full"
          />

          <div className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setRecommendedLayerOn(!recommendedLayerOn)}
              className={cn(
                "text-xs font-medium rounded-full px-3 py-1.5 transition-colors",
                recommendedLayerOn ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300/60" : "text-zinc-500 hover:bg-zinc-100",
              )}
            >
              ⭐ Рекомендуют
            </button>
          </div>

          {/* Mobile FAB: safe-area + запас от нижней панели браузера / home indicator */}
          <div
            className="md:hidden absolute z-[1000] flex flex-col gap-3"
            style={{
              right: "max(1rem, env(safe-area-inset-right, 0px))",
              bottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))",
            }}
          >
            <button
              onClick={() => setActiveModal("filters")}
              className="flex items-center justify-center h-12 w-12 rounded-full bg-white shadow-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
            <button
              onClick={() => setMobileListOpen(true)}
              className="flex items-center justify-center h-12 w-12 rounded-full bg-white shadow-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onClick={handleAddPlace}
              className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 shadow-lg text-white hover:bg-blue-700"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          {/* Pick mode overlay */}
          {pickMode && (
            <div className="absolute top-16 md:top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
              Нажмите на карту, чтобы выбрать точку
              <button onClick={() => { setPickMode(false); setPickedLocation(null); }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile places list bottom sheet */}
      <BottomSheet isOpen={mobileListOpen} onClose={() => setMobileListOpen(false)} title={`Места (${places.length})`}>
        <div className="space-y-2">
          {places.length === 0 ? (
            <EmptyState type="no-results" />
          ) : (
            places.map((place) => (
              <PlaceCardSmall
                key={place.id}
                place={place}
                onClick={() => {
                  setMobileListOpen(false);
                  handlePlaceClick(place);
                }}
              />
            ))
          )}
        </div>
      </BottomSheet>

      {/* Mobile filters bottom sheet */}
      <BottomSheet isOpen={activeModal === "filters"} onClose={closeModal} title="Фильтры">
        <FiltersPanel
          categories={categories}
          tags={tags}
          selectedCategory={selectedCategory}
          selectedTags={selectedTags}
          verifiedOnly={verifiedOnly}
          hasReviewsOnly={hasReviewsOnly}
          onCategoryChange={setSelectedCategory}
          onTagToggle={handleTagToggle}
          onVerifiedToggle={() => setVerifiedOnly(!verifiedOnly)}
          onHasReviewsToggle={() => setHasReviewsOnly(!hasReviewsOnly)}
          onReset={handleResetFilters}
        />
      </BottomSheet>

      {/* Place detail modal */}
      <Modal isOpen={activeModal === "place-detail" && !!selectedPlace} onClose={closeModal} title={selectedPlace?.title} size="lg">
        {selectedPlace && (
          <PlaceCardFull
            place={selectedPlace}
            onReport={() => setActiveModal("report")}
            onAddReview={() => setActiveModal("add-review")}
          />
        )}
      </Modal>

      {/* Add place modal */}
      <Modal isOpen={activeModal === "add-place"} onClose={closeModal} title="Добавить место" size="lg">
        <AddPlaceForm
          lat={pickedLocation?.[0]}
          lng={pickedLocation?.[1]}
          initialValues={placeFormDraft}
          onSubmit={handleAddPlaceSubmit}
          onCoordinatesChange={handleManualCoordinatesChange}
          onBeforePickLocation={(snap) => setPlaceFormDraft(snap)}
          onPickLocation={() => {
            setPickMode(true);
            closeModal(false);
          }}
        />
      </Modal>

      {/* Add review modal */}
      <Modal isOpen={activeModal === "add-review" && !!selectedPlace} onClose={() => setActiveModal("place-detail")} title="Оставить отзыв">
        {selectedPlace && (
          <AddReviewForm
            placeId={selectedPlace.id}
            placeName={selectedPlace.title}
            onSuccess={() => setActiveModal("place-detail")}
          />
        )}
      </Modal>

      {/* Report modal */}
      <Modal isOpen={activeModal === "report" && !!selectedPlace} onClose={() => setActiveModal("place-detail")} title="Жалоба">
        {selectedPlace && (
          <ReportForm
            entityType="place"
            entityId={selectedPlace.id}
            entityName={selectedPlace.title}
            onSuccess={() => setActiveModal("place-detail")}
          />
        )}
      </Modal>
      </div>
      <HomeSeoSection />
    </>
  );
}

function HomeSeoSection() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">VietRadar</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
            Русская карта Нячанга: полезные места для туристов и экспатов
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            На карте собраны места Нячанга, которые помогают русскоязычным быстрее сориентироваться в городе: врачи,
            аптеки, обменники, кафе с русским меню, гиды, салоны красоты, достопримечательности и предупреждения об
            опасных зонах.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {HOME_SEO_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60"
            >
              <span className="text-2xl" aria-hidden="true">{category.icon}</span>
              <h2 className="mt-3 text-lg font-semibold text-zinc-900">{category.name_ru} в Нячанге</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Адреса, контакты, отзывы и отметки о русскоязычном сервисе.
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <h2 className="text-xl font-semibold text-zinc-900">Что можно найти на карте</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Ищите по названию, категории или полезным отметкам: «говорят по-русски», «есть русский врач», «хороший
            курс», «работают по страховке», «можно с детьми». Для подробных подборок откройте раздел{" "}
            <Link href="/articles" className="font-medium text-blue-700 hover:text-blue-800">
              «Интересные места»
            </Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
