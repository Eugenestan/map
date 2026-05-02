import { CATEGORIES, MOCK_PLACES, MOCK_REVIEWS, TAGS } from "@/data/seed";
import type { PlaceStatus, Report, ReportStatus, ReviewStatus } from "@/types";

type DevPlaceRecord = {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  status: PlaceStatus;
  description: string | null;
  address_text: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  telegram: string | null;
  working_hours: string | null;
  is_verified: boolean;
  last_verified_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type DevReviewRecord = {
  id: string;
  place_id: string;
  text: string;
  author_name: string | null;
  visit_period: string | null;
  status: ReviewStatus;
  likes_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
};

declare global {
  var __nhatrangDevStore__:
    | {
        places: DevPlaceRecord[];
        reviews: DevReviewRecord[];
        reports: Report[];
        reviewSessionLikes: Set<string>;
      }
    | undefined;
}

function createInitialStore() {
  const places: DevPlaceRecord[] = MOCK_PLACES.map((place) => ({
    id: place.id,
    title: place.title,
    slug: place.slug,
    category_id: place.category_id,
    status: place.status,
    description: place.description ?? null,
    address_text: place.address_text ?? null,
    lat: place.lat,
    lng: place.lng,
    phone: place.phone ?? null,
    website: place.website ?? null,
    telegram: place.telegram ?? null,
    working_hours: place.working_hours ?? null,
    is_verified: place.is_verified,
    last_verified_at: place.last_verified_at ?? null,
    tags: [...place.tags],
    created_at: place.last_verified_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: place.last_verified_at ?? "2026-01-01T00:00:00.000Z",
  }));

  const reviews: DevReviewRecord[] = MOCK_REVIEWS.map((review) => ({
    id: review.id,
    place_id: review.place_id,
    text: review.text,
    author_name: review.author_name ?? null,
    visit_period: review.visit_period ?? null,
    status: review.status,
    likes_count: review.likes_count,
    tags: [...review.tags],
    created_at: review.created_at,
    updated_at: review.created_at,
  }));

  return {
    places,
    reviews,
    reports: [],
    reviewSessionLikes: new Set<string>(),
  };
}

export function getDevStore() {
  if (!global.__nhatrangDevStore__) {
    global.__nhatrangDevStore__ = createInitialStore();
  } else if (!global.__nhatrangDevStore__.reviewSessionLikes) {
    global.__nhatrangDevStore__.reviewSessionLikes = new Set();
  }

  return global.__nhatrangDevStore__;
}

export function getDevCategories() {
  return CATEGORIES;
}

export function getDevTags() {
  return TAGS;
}

export function getDevPlaceById(id: string) {
  return getDevStore().places.find((place) => place.id === id) ?? null;
}

export function listDevPlaces() {
  return getDevStore().places;
}

export function listDevReviews() {
  return getDevStore().reviews;
}

export function getDevReviewsByPlace(placeId: string) {
  return getDevStore().reviews.filter((review) => review.place_id === placeId);
}

export function insertDevPlace(place: DevPlaceRecord) {
  getDevStore().places.unshift(place);
}

export function updateDevPlace(id: string, updater: (place: DevPlaceRecord) => DevPlaceRecord) {
  const store = getDevStore();
  const index = store.places.findIndex((place) => place.id === id);
  if (index === -1) {
    return false;
  }

  store.places[index] = updater(store.places[index]);
  return true;
}

export function insertDevReview(review: DevReviewRecord) {
  getDevStore().reviews.unshift(review);
}

export function updateDevReview(id: string, updater: (review: DevReviewRecord) => DevReviewRecord) {
  const store = getDevStore();
  const index = store.reviews.findIndex((review) => review.id === id);
  if (index === -1) {
    return false;
  }

  store.reviews[index] = updater(store.reviews[index]);
  return true;
}

export function insertDevReport(report: Report) {
  getDevStore().reports.unshift(report);
}

export function listDevReports(status?: ReportStatus) {
  const reports = getDevStore().reports;
  return status ? reports.filter((report) => report.status === status) : reports;
}

export function updateDevReportStatus(id: string, status: ReportStatus) {
  const store = getDevStore();
  const index = store.reports.findIndex((report) => report.id === id);
  if (index === -1) {
    return false;
  }

  store.reports[index] = { ...store.reports[index], status };
  return true;
}
