"use client";

import dynamic from "next/dynamic";
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
import { Plus, SlidersHorizontal, List, X } from "lucide-react";

const MapView = dynamic(
  () => import("@/components/features/map/map-view").then((m) => m.MapView),
  { ssr: false, loading: () => <div className="flex-1 bg-zinc-100 flex items-center justify-center text-zinc-400">Загрузка карты...</div> },
);

type ModalType = "place-detail" | "add-place" | "add-review" | "report" | "filters" | null;

export default function HomePage() {
  const [places, setPlaces] = useState<PlaceWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
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

    try {
      const res = await fetch(`/api/places?${params}`);
      const data = await res.json();
      setPlaces(data.data || []);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedTags, verifiedOnly]);

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
    setPickMode(false);
    setActiveModal("add-place");
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
    }
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

  return (
    <div className="flex flex-col h-screen">
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
                onCategoryChange={setSelectedCategory}
                onTagToggle={handleTagToggle}
                onVerifiedToggle={() => setVerifiedOnly(!verifiedOnly)}
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
          <div className="md:hidden absolute top-3 left-3 right-3 z-[1000]">
            <SearchBar value={search} onChange={setSearch} className="shadow-lg" />
          </div>

          <MapView
            places={places}
            onPlaceClick={handlePlaceClick}
            pickMode={pickMode}
            onPick={handlePick}
            pickedLocation={pickedLocation}
            flyTo={flyTo}
            className="w-full h-full"
          />

          {/* Mobile FAB buttons */}
          <div className="md:hidden absolute bottom-6 right-4 z-[1000] flex flex-col gap-3">
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
          onCategoryChange={setSelectedCategory}
          onTagToggle={handleTagToggle}
          onVerifiedToggle={() => setVerifiedOnly(!verifiedOnly)}
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
  );
}
