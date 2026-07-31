import { CATEGORIES, MOCK_PLACES, MOCK_REVIEWS, TAGS } from "@/data/seed";
import type {
  Article,
  InterestingArticle,
  InterestingArticleCategory,
  PlaceStatus,
  Report,
  ReportStatus,
  ReviewStatus,
} from "@/types";

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
  admin_recommended: boolean;
  place_info: string | null;
  photo_urls: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
};

type DevArticleRecord = Article;

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

export type DevAnalyticsEvent = {
  occurred_at: string;
  event_type: "page_view" | "action";
  path: string;
  target: string | null;
  entity_id: string | null;
  visitor_id: string;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: "mobile" | "desktop" | "tablet" | "other";
};

declare global {
  var __nhatrangDevStore__:
    | {
        places: DevPlaceRecord[];
        reviews: DevReviewRecord[];
        reports: Report[];
        articles: DevArticleRecord[];
        interestingArticles: InterestingArticle[];
        interestingArticleCategories: InterestingArticleCategory[];
        reviewSessionLikes: Set<string>;
        visitStats: Map<string, { visits: number; visitors: Set<string> }>;
        analyticsEvents: DevAnalyticsEvent[];
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
    admin_recommended: !!(place as { admin_recommended?: boolean }).admin_recommended,
    tags: [...place.tags],
    place_info: null,
    photo_urls: [],
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
    articles: [],
    interestingArticles: [],
    interestingArticleCategories: [],
    reviewSessionLikes: new Set<string>(),
    visitStats: new Map(),
    analyticsEvents: [],
  };
}

export function getDevStore() {
  if (!global.__nhatrangDevStore__) {
    global.__nhatrangDevStore__ = createInitialStore();
  } else if (!global.__nhatrangDevStore__.reviewSessionLikes) {
    global.__nhatrangDevStore__.reviewSessionLikes = new Set();
  }
  global.__nhatrangDevStore__.interestingArticles ??= [];
  global.__nhatrangDevStore__.interestingArticleCategories ??= [];
  global.__nhatrangDevStore__.analyticsEvents ??= [];

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

export function listDevArticles() {
  return getDevStore().articles;
}

export function insertDevArticle(article: DevArticleRecord) {
  getDevStore().articles.unshift(article);
}

export function getDevArticleById(id: string) {
  return getDevStore().articles.find((article) => article.id === id) ?? null;
}

export function updateDevArticle(id: string, updater: (article: DevArticleRecord) => DevArticleRecord) {
  const store = getDevStore();
  const index = store.articles.findIndex((article) => article.id === id);
  if (index === -1) {
    return false;
  }
  store.articles[index] = updater(store.articles[index]);
  return true;
}

export function deleteDevArticle(id: string) {
  const store = getDevStore();
  const next = store.articles.filter((article) => article.id !== id);
  if (next.length === store.articles.length) {
    return false;
  }
  store.articles = next;
  return true;
}

export function listDevInterestingArticles() {
  return getDevStore().interestingArticles;
}

export function getDevInterestingArticleById(id: string) {
  return getDevStore().interestingArticles.find((article) => article.id === id) ?? null;
}

export function insertDevInterestingArticle(article: InterestingArticle) {
  getDevStore().interestingArticles.unshift(article);
}

export function updateDevInterestingArticle(
  id: string,
  updater: (article: InterestingArticle) => InterestingArticle,
) {
  const store = getDevStore();
  const index = store.interestingArticles.findIndex((article) => article.id === id);
  if (index === -1) return false;
  store.interestingArticles[index] = updater(store.interestingArticles[index]);
  return true;
}

export function deleteDevInterestingArticle(id: string) {
  const store = getDevStore();
  const next = store.interestingArticles.filter((article) => article.id !== id);
  if (next.length === store.interestingArticles.length) return false;
  store.interestingArticles = next;
  return true;
}

export function listDevInterestingArticleCategories() {
  return getDevStore().interestingArticleCategories;
}

export function getDevInterestingArticleCategoryById(id: string) {
  return getDevStore().interestingArticleCategories.find((category) => category.id === id) ?? null;
}

export function insertDevInterestingArticleCategory(category: InterestingArticleCategory) {
  getDevStore().interestingArticleCategories.push(category);
}

export function updateDevInterestingArticleCategory(
  id: string,
  updater: (category: InterestingArticleCategory) => InterestingArticleCategory,
) {
  const store = getDevStore();
  const index = store.interestingArticleCategories.findIndex((category) => category.id === id);
  if (index === -1) return false;
  store.interestingArticleCategories[index] = updater(store.interestingArticleCategories[index]);
  return true;
}

export function deleteDevInterestingArticleCategory(id: string) {
  const store = getDevStore();
  const next = store.interestingArticleCategories.filter((category) => category.id !== id);
  if (next.length === store.interestingArticleCategories.length) return false;
  store.interestingArticleCategories = next;
  return true;
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

export function trackDevVisit(path: string, sessionId: string, day: string, isUniqueVisitor: boolean) {
  const key = `${day}|${path}`;
  const store = getDevStore();
  const current = store.visitStats.get(key) ?? { visits: 0, visitors: new Set<string>() };
  current.visits += 1;
  if (isUniqueVisitor) {
    current.visitors.add(sessionId);
  }
  store.visitStats.set(key, current);
}

export function listDevVisitStats(days = 7) {
  const store = getDevStore();
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - Math.max(days - 1, 0));
  const fromKey = from.toISOString().slice(0, 10);

  return [...store.visitStats.entries()]
    .map(([key, value]) => {
      const [day, path] = key.split("|");
      return {
        day,
        path,
        visits: value.visits,
        unique_visitors: value.visitors.size,
      };
    })
    .filter((row) => row.day >= fromKey)
    .sort((a, b) => (a.day === b.day ? a.path.localeCompare(b.path) : b.day.localeCompare(a.day)));
}

export function trackDevAnalyticsEvent(event: DevAnalyticsEvent) {
  getDevStore().analyticsEvents.push(event);
}

export function listDevAnalyticsEvents() {
  return getDevStore().analyticsEvents;
}
