"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Flag, LogOut, MapPin, MessageSquare, Newspaper, Plus, RefreshCw, Settings, X } from "lucide-react";
import { ApprovedPlaceEditor } from "@/components/features/admin/approved-place-editor";
import { PendingPlaceModerationModal } from "@/components/features/admin/pending-place-moderation-modal";
import { AddArticleModal } from "@/components/features/admin/add-article-modal";
import { EditArticleModal } from "@/components/features/admin/edit-article-modal";
import { InterestingArticleModal } from "@/components/features/admin/interesting-article-modal";
import { InterestingArticleCategoriesModal } from "@/components/features/admin/interesting-article-categories-modal";
import { AdminAnalyticsPanel } from "@/components/features/admin/admin-analytics-panel";
import { FormattedText } from "@/components/ui/formatted-text";
import { TagBadge } from "@/components/ui/tag-badge";
import { cn } from "@/lib/cn";
import type {
  Article,
  InterestingArticleCategory,
  InterestingArticleStatus,
  InterestingArticleWithCategory,
  PlaceWithDetails,
  Report,
  ReviewWithTags,
  Tag,
} from "@/types";

type Tab = "places" | "approved" | "reviews" | "reports" | "articles" | "interestingArticles";

interface ReportWithTitle extends Report {
  entity_title?: string;
}

interface AdminDashboardProps {
  adminEmail: string;
}

const INTERESTING_ARTICLES_PAGE_SIZE = 20;

export function AdminDashboard({ adminEmail }: AdminDashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("places");
  const [pendingPlaces, setPendingPlaces] = useState<PlaceWithDetails[]>([]);
  const [approvedPlaces, setApprovedPlaces] = useState<PlaceWithDetails[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ReviewWithTags[]>([]);
  const [reports, setReports] = useState<ReportWithTitle[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [interestingArticles, setInterestingArticles] = useState<InterestingArticleWithCategory[]>([]);
  const [interestingArticlesTotal, setInterestingArticlesTotal] = useState(0);
  const [interestingArticleCategories, setInterestingArticleCategories] = useState<InterestingArticleCategory[]>([]);
  const [interestingArticlesLoading, setInterestingArticlesLoading] = useState(false);
  const [interestingArticlesError, setInterestingArticlesError] = useState("");
  const [interestingArticlesQueryInput, setInterestingArticlesQueryInput] = useState("");
  const [interestingArticlesQuery, setInterestingArticlesQuery] = useState("");
  const [interestingArticlesStatus, setInterestingArticlesStatus] = useState<InterestingArticleStatus | "">("");
  const [interestingArticlesCategory, setInterestingArticlesCategory] = useState("");
  const [interestingArticlesOffset, setInterestingArticlesOffset] = useState(0);
  const [selectedApprovedPlace, setSelectedApprovedPlace] = useState<PlaceWithDetails | null>(null);
  const [selectedPendingPlace, setSelectedPendingPlace] = useState<PlaceWithDetails | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedInterestingArticle, setSelectedInterestingArticle] = useState<InterestingArticleWithCategory | null>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isInterestingArticleModalOpen, setIsInterestingArticleModalOpen] = useState(false);
  const [isInterestingCategoriesModalOpen, setIsInterestingCategoriesModalOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleUnauthorized = useCallback(() => {
    router.refresh();
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [placesRes, approvedRes, reviewsRes, reportsRes, articlesRes] = await Promise.all([
        fetch("/api/admin/pending-places"),
        fetch("/api/admin/approved-places"),
        fetch("/api/admin/pending-reviews"),
        fetch("/api/reports"),
        fetch("/api/admin/articles"),
      ]);

      if ([placesRes, approvedRes, reviewsRes, reportsRes, articlesRes].some((response) => response.status === 401)) {
        handleUnauthorized();
        return;
      }

      const placesData = await placesRes.json();
      setPendingPlaces(placesData.data || []);

      const approvedData = await approvedRes.json();
      setApprovedPlaces(approvedData.data || []);

      const reviewsData = await reviewsRes.json();
      setPendingReviews(reviewsData.data || []);

      const reportsData = await reportsRes.json();
      setReports(reportsData.data || []);

      const articlesData = await articlesRes.json();
      setArticles(articlesData.data || []);

    } catch (error) {
      console.error("Ошибка загрузки данных модерации:", error);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  const fetchInterestingArticleCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/interesting-article-categories");
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Не удалось загрузить категории");
      setInterestingArticleCategories(body?.data || []);
    } catch (error) {
      setInterestingArticlesError(error instanceof Error ? error.message : "Не удалось загрузить категории");
    }
  }, [handleUnauthorized]);

  const fetchInterestingArticles = useCallback(async () => {
    setInterestingArticlesLoading(true);
    setInterestingArticlesError("");
    try {
      const params = new URLSearchParams({
        limit: String(INTERESTING_ARTICLES_PAGE_SIZE),
        offset: String(interestingArticlesOffset),
      });
      if (interestingArticlesQuery) params.set("q", interestingArticlesQuery);
      if (interestingArticlesStatus) params.set("status", interestingArticlesStatus);
      if (interestingArticlesCategory) params.set("category", interestingArticlesCategory);
      const response = await fetch(`/api/admin/interesting-articles?${params.toString()}`);
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Не удалось загрузить интересные статьи");
      setInterestingArticles(body?.data || []);
      setInterestingArticlesTotal(body?.total || 0);
    } catch (error) {
      setInterestingArticlesError(error instanceof Error ? error.message : "Не удалось загрузить интересные статьи");
    } finally {
      setInterestingArticlesLoading(false);
    }
  }, [
    handleUnauthorized,
    interestingArticlesCategory,
    interestingArticlesOffset,
    interestingArticlesQuery,
    interestingArticlesStatus,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    void fetchInterestingArticleCategories();
  }, [fetchInterestingArticleCategories]);

  useEffect(() => {
    if (tab === "interestingArticles") void fetchInterestingArticles();
  }, [fetchInterestingArticles, tab]);

  useEffect(() => {
    fetch("/api/tags")
      .then((response) => response.json())
      .then((data) => setTags(data.data || []))
      .catch(() => setTags([]));
  }, []);

  const handleRejectPlace = async (id: string) => {
    const response = await fetch(`/api/places/${id}/reject`, { method: "POST" });
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    setPendingPlaces((prev) => prev.filter((place) => place.id !== id));
  };

  const handleResolveReport = async (id: string) => {
    const response = await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "resolved" }),
    });
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    setReports((prev) => prev.filter((report) => report.id !== id));
  };

  const handleDismissReport = async (id: string) => {
    const response = await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "dismissed" }),
    });
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    setReports((prev) => prev.filter((report) => report.id !== id));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const reasonLabels: Record<string, string> = {
    wrong_info: "Неверная информация",
    spam: "Спам",
    offensive: "Оскорбление",
    duplicate: "Дубликат",
    nonexistent: "Несуществующее место",
    other: "Другое",
  };

  const tabs: { id: Tab; label: string; count: number; icon: ReactNode }[] = [
    { id: "places", label: "Места", count: pendingPlaces.length, icon: <MapPin className="h-4 w-4" /> },
    { id: "approved", label: "Одобренные", count: approvedPlaces.length, icon: <MapPin className="h-4 w-4" /> },
    { id: "reviews", label: "Отзывы", count: pendingReviews.length, icon: <MessageSquare className="h-4 w-4" /> },
    { id: "reports", label: "Жалобы", count: reports.length, icon: <Flag className="h-4 w-4" /> },
    { id: "articles", label: "Интересные места", count: articles.length, icon: <FileText className="h-4 w-4" /> },
    { id: "interestingArticles", label: "Интересные статьи", count: interestingArticlesTotal, icon: <Newspaper className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Модерация</h1>
          <p className="mt-1 text-sm text-zinc-500">Вы вошли как {adminEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "articles" && (
            <button
              onClick={() => setIsArticleModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              <Plus className="h-4 w-4" /> Добавить место
            </button>
          )}
          {tab === "interestingArticles" && (
            <>
              <button
                onClick={() => setIsInterestingCategoriesModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                <Settings className="h-4 w-4" /> Категории
              </button>
              <button
                onClick={() => setIsInterestingArticleModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Новая статья
              </button>
            </>
          )}
          <button
            onClick={() => {
              void fetchData();
              setAnalyticsRefreshKey((key) => key + 1);
              if (tab === "interestingArticles") {
                void fetchInterestingArticles();
                void fetchInterestingArticleCategories();
              }
            }}
            disabled={loading || interestingArticlesLoading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw className={cn("h-4 w-4", (loading || interestingArticlesLoading) && "animate-spin")} /> Обновить
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <LogOut className="h-4 w-4" /> {loggingOut ? "Выход..." : "Выйти"}
          </button>
        </div>
      </div>

      <AdminAnalyticsPanel refreshKey={analyticsRefreshKey} />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((currentTab) => (
          <button
            key={currentTab.id}
            onClick={() => setTab(currentTab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === currentTab.id
                ? "bg-blue-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
            )}
          >
            {currentTab.icon} {currentTab.label}
            {currentTab.count > 0 && (
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-xs",
                  tab === currentTab.id ? "bg-blue-500 text-white" : "bg-zinc-100 text-zinc-600",
                )}
              >
                {currentTab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "places" && (
        <div className="space-y-3">
          {pendingPlaces.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">Нет мест на модерации</div>
          ) : (
            pendingPlaces.map((place) => (
              <div key={place.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-lg">{place.category?.icon}</span>
                      <h3 className="font-semibold text-zinc-900">{place.title}</h3>
                    </div>
                    <p className="text-sm text-zinc-500">{place.category?.name_ru}</p>
                    {place.address_text && <p className="mt-1 text-sm text-zinc-500">{place.address_text}</p>}
                    {place.description && <p className="mt-2 text-sm text-zinc-600">{place.description}</p>}
                    <p className="mt-2 text-xs text-zinc-400">
                      Координаты: {place.lat.toFixed(7)}, {place.lng.toFixed(7)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => setSelectedPendingPlace(place)}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" /> Одобрить
                    </button>
                    <button
                      onClick={() => handleRejectPlace(place.id)}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      <X className="h-4 w-4" /> Отклонить
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "reviews" && (
        <div className="space-y-3">
          {pendingReviews.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">Нет отзывов на модерации</div>
          ) : (
            pendingReviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-zinc-800">{review.text}</p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {review.author_name || "Аноним"} · {review.visit_period || ""}
                    </p>
                    {review.tags && review.tags.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {review.tags.map((tag) => (
                          <TagBadge key={tag.id} label={tag.name_ru} type={tag.tag_type} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={async () => {
                        const response = await fetch(`/api/reviews/${review.id}/approve`, { method: "POST" });
                        if (response.status === 401) {
                          handleUnauthorized();
                          return;
                        }

                        setPendingReviews((prev) => prev.filter((item) => item.id !== review.id));
                      }}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        const response = await fetch(`/api/reviews/${review.id}/reject`, { method: "POST" });
                        if (response.status === 401) {
                          handleUnauthorized();
                          return;
                        }

                        setPendingReviews((prev) => prev.filter((item) => item.id !== review.id));
                      }}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "approved" && (
        <div className="space-y-3">
          {approvedPlaces.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">Нет одобренных мест</div>
          ) : (
            approvedPlaces.map((place) => (
              <div key={place.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-lg">{place.category?.icon}</span>
                      <h3 className="font-semibold text-zinc-900">{place.title}</h3>
                      {place.is_verified && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                          Проверено
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">{place.category?.name_ru}</p>
                    {place.address_text && <p className="mt-1 text-sm text-zinc-500">{place.address_text}</p>}
                    {place.description && <p className="mt-2 text-sm text-zinc-600">{place.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {place.tags.map((tag) => (
                        <TagBadge key={tag.id} label={tag.tag.name_ru} type={tag.tag.tag_type} />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">
                      Отзывов: {place.reviews_count} · Координаты: {place.lat.toFixed(7)}, {place.lng.toFixed(7)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => setSelectedApprovedPlace(place)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Редактировать
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">Нет жалоб на рассмотрении</div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        {report.entity_type === "place" ? "Место" : "Отзыв"}
                      </span>
                      <span className="rounded bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                        {reasonLabels[report.reason] || report.reason}
                      </span>
                    </div>
                    {report.entity_title && (
                      <p className="mt-1 text-sm font-medium text-zinc-800">{report.entity_title}</p>
                    )}
                    {report.comment && <p className="mt-1 text-sm text-zinc-600">{report.comment}</p>}
                    <p className="mt-2 text-xs text-zinc-400">
                      {new Date(report.created_at).toLocaleDateString("ru")}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => handleResolveReport(report.id)}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                      title="Решено"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDismissReport(report.id)}
                      className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                      title="Отклонить"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "articles" && (
        <div className="space-y-3">
          {articles.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">Пока нет мест</div>
          ) : (
            articles.map((article) => (
              <div key={article.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-zinc-900">{article.title}</h3>
                    <FormattedText text={article.description} className="mt-1 line-clamp-2 text-sm text-zinc-600" />
                    <p className="mt-2 text-xs text-zinc-400">
                      /articles/{article.slug} · {article.photo_urls.length} фото
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedArticle(article)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Редактировать
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "interestingArticles" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <form
              className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_180px_180px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                setInterestingArticlesOffset(0);
                setInterestingArticlesQuery(interestingArticlesQueryInput.trim());
              }}
            >
              <input
                value={interestingArticlesQueryInput}
                onChange={(event) => setInterestingArticlesQueryInput(event.target.value)}
                placeholder="Поиск по статьям..."
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <select
                value={interestingArticlesStatus}
                onChange={(event) => {
                  setInterestingArticlesOffset(0);
                  setInterestingArticlesStatus(event.target.value as InterestingArticleStatus | "");
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              >
                <option value="">Все статусы</option>
                <option value="draft">Черновики</option>
                <option value="published">Опубликованные</option>
              </select>
              <select
                value={interestingArticlesCategory}
                onChange={(event) => {
                  setInterestingArticlesOffset(0);
                  setInterestingArticlesCategory(event.target.value);
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              >
                <option value="">Все категории</option>
                {interestingArticleCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name_ru}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
                Найти
              </button>
            </form>
          </div>

          {interestingArticlesError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{interestingArticlesError}</p>
          )}

          {interestingArticlesLoading ? (
            <div className="py-12 text-center text-zinc-400">Загрузка статей...</div>
          ) : interestingArticles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white py-12 text-center">
              <p className="text-zinc-500">Статей по выбранным условиям нет</p>
              <button onClick={() => setIsInterestingArticleModalOpen(true)} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">
                Создать первую статью
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {interestingArticles.map((article) => (
                <div key={article.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-start gap-4">
                    {article.cover_image_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={article.cover_image_url} alt="" className="hidden h-24 w-36 flex-shrink-0 rounded-lg object-cover sm:block" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${article.status === "published" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                          {article.status === "published" ? "Опубликована" : "Черновик"}
                        </span>
                        <span className="text-xs text-zinc-400">{article.category.name_ru}</span>
                      </div>
                      <h3 className="mt-1 font-semibold text-zinc-900">{article.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{article.excerpt}</p>
                      <p className="mt-2 text-xs text-zinc-400">
                        /interesting-articles/{article.slug} · {article.media_urls.length} медиа · {article.place_ids.length} мест · обновлено {new Date(article.updated_at).toLocaleDateString("ru")}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedInterestingArticle(article)}
                      className="flex-shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Редактировать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {interestingArticlesTotal > INTERESTING_ARTICLES_PAGE_SIZE && (
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
              <span className="text-sm text-zinc-500">
                {interestingArticlesOffset + 1}–{Math.min(interestingArticlesOffset + INTERESTING_ARTICLES_PAGE_SIZE, interestingArticlesTotal)} из {interestingArticlesTotal}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={interestingArticlesOffset === 0}
                  onClick={() => setInterestingArticlesOffset((offset) => Math.max(0, offset - INTERESTING_ARTICLES_PAGE_SIZE))}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 disabled:opacity-40"
                >
                  Назад
                </button>
                <button
                  disabled={interestingArticlesOffset + INTERESTING_ARTICLES_PAGE_SIZE >= interestingArticlesTotal}
                  onClick={() => setInterestingArticlesOffset((offset) => offset + INTERESTING_ARTICLES_PAGE_SIZE)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 disabled:opacity-40"
                >
                  Далее
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ApprovedPlaceEditor
        place={selectedApprovedPlace}
        isOpen={!!selectedApprovedPlace}
        onClose={() => setSelectedApprovedPlace(null)}
        onUnauthorized={handleUnauthorized}
        onSaved={fetchData}
      />
      <PendingPlaceModerationModal
        key={selectedPendingPlace ? `${selectedPendingPlace.id}-${selectedPendingPlace.updated_at}` : "pending-place-modal"}
        place={selectedPendingPlace}
        isOpen={!!selectedPendingPlace}
        onClose={() => setSelectedPendingPlace(null)}
        onUnauthorized={handleUnauthorized}
        onSaved={fetchData}
      />
      <AddArticleModal
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
        onUnauthorized={handleUnauthorized}
        onSaved={fetchData}
        tags={tags}
        places={approvedPlaces}
      />
      <EditArticleModal
        key={selectedArticle ? `${selectedArticle.id}-${selectedArticle.updated_at}` : "article-editor"}
        article={selectedArticle}
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onUnauthorized={handleUnauthorized}
        onSaved={fetchData}
        onDeleted={fetchData}
        tags={tags}
        places={approvedPlaces}
      />
      <InterestingArticleModal
        key={selectedInterestingArticle ? `${selectedInterestingArticle.id}-${selectedInterestingArticle.updated_at}` : "new-interesting-article"}
        article={selectedInterestingArticle}
        isOpen={isInterestingArticleModalOpen || !!selectedInterestingArticle}
        categories={interestingArticleCategories}
        places={approvedPlaces}
        onClose={() => {
          setIsInterestingArticleModalOpen(false);
          setSelectedInterestingArticle(null);
        }}
        onUnauthorized={handleUnauthorized}
        onSaved={fetchInterestingArticles}
        onDeleted={fetchInterestingArticles}
      />
      <InterestingArticleCategoriesModal
        isOpen={isInterestingCategoriesModalOpen}
        categories={interestingArticleCategories}
        onClose={() => setIsInterestingCategoriesModalOpen(false)}
        onUnauthorized={handleUnauthorized}
        onChanged={async () => {
          await fetchInterestingArticleCategories();
          await fetchInterestingArticles();
        }}
      />
    </div>
  );
}
