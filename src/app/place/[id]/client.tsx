"use client";

import { useState } from "react";
import type { PlaceWithDetails, ReviewWithTags } from "@/types";
import { Header } from "@/components/ui/header";
import { PlaceCardFull } from "@/components/features/places/place-card-full";
import { AddReviewForm } from "@/components/features/forms/add-review-form";
import { ReportForm } from "@/components/features/forms/report-form";
import { Modal } from "@/components/ui/modal";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  place: PlaceWithDetails;
  initialReviews: ReviewWithTags[];
}

export function PlacePageClient({ place }: Props) {
  const [modal, setModal] = useState<"review" | "report" | null>(null);

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <div className="max-w-2xl mx-auto py-6 px-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Назад к карте
        </Link>
        <div className="bg-white rounded-2xl border border-zinc-200 p-6">
          <PlaceCardFull
            place={place}
            onAddReview={() => setModal("review")}
            onReport={() => setModal("report")}
          />
        </div>
      </div>

      <Modal isOpen={modal === "review"} onClose={() => setModal(null)} title="Оставить отзыв">
        <AddReviewForm placeId={place.id} placeName={place.title} onSuccess={() => setModal(null)} />
      </Modal>

      <Modal isOpen={modal === "report"} onClose={() => setModal(null)} title="Жалоба">
        <ReportForm entityType="place" entityId={place.id} entityName={place.title} onSuccess={() => setModal(null)} />
      </Modal>
    </div>
  );
}
