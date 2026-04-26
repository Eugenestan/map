import { getPlaceById } from "@/services/places";
import { getReviewsByPlace } from "@/services/reviews";
import { notFound } from "next/navigation";
import { PlacePageClient } from "./client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlacePage({ params }: Props) {
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) notFound();

  const reviews = await getReviewsByPlace(id);

  return <PlacePageClient place={place} initialReviews={reviews} />;
}
