"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Flag, LogOut, MapPin, MessageSquare, RefreshCw, X } from "lucide-react";
import { ApprovedPlaceEditor } from "@/components/features/admin/approved-place-editor";
import { TagBadge } from "@/components/ui/tag-badge";
import { cn } from "@/lib/cn";
import type { PlaceWithDetails, Report, ReviewWithTags } from "@/types";

type Tab = "places" | "approved" | "reviews" | "reports";

interface ReportWithTitle extends Report {
  entity_title?: string;
}

interface AdminDashboardProps {
  adminEmail: string;
}

export function AdminDashboard({ adminEmail }: AdminDashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("places");
  const [pendingPlaces, setPendingPlaces] = useState<PlaceWithDetails[]>([]);
  const [approvedPlaces, setApprovedPlaces] = useState<PlaceWithDetails[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ReviewWithTags[]>([]);
  const [reports, setReports] = useState<ReportWithTitle[]>([]);
  const [selectedApprovedPlace, setSelectedApprovedPlace] = useState<PlaceWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleUnauthorized = useCallback(() => {
    router.refresh();
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [placesRes, approvedRes, reviewsRes, reportsRes] = await Promise.all([
        fetch("/api/admin/pending-places"),
        fetch("/api/admin/approved-places"),
        fetch("/api/admin/pending-reviews"),
        fetch("/api/reports"),
      ]);

      if ([placesRes, approvedRes, reviewsRes, reportsRes].some((response) => response.status === 401)) {
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
    } catch (error) {
      console.error("Ошибка загрузки данных модерации:", error);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprovePlace = async (id: string) => {
    const response = await fetch(`/api/places/${id}/approve`, { method: "POST" });
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    setPendingPlaces((prev) => prev.filter((place) => place.id !== id));
  };

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
  ];

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Модерация</h1>
          <p className="mt-1 text-sm text-zinc-500">Вы вошли как {adminEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Обновить
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

      <div className="mb-6 flex gap-2">
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
                      Координаты: {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => handleApprovePlace(place.id)}
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
                      Отзывов: {place.reviews_count} · Координаты: {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
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

      <ApprovedPlaceEditor
        place={selectedApprovedPlace}
        isOpen={!!selectedApprovedPlace}
        onClose={() => setSelectedApprovedPlace(null)}
        onUnauthorized={handleUnauthorized}
        onSaved={fetchData}
      />
    </div>
  );
}
