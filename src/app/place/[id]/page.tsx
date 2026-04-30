import type { Metadata } from "next";
import { getPlaceById } from "@/services/places";
import { getReviewsByPlace } from "@/services/reviews";
import { notFound } from "next/navigation";
import { PlacePageClient } from "./client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nhatrang.guide";
  const title = `${place.title} — ${place.category?.name_ru ?? "место"} в Нячанге`;
  const description =
    place.description
      ? `${place.description.slice(0, 140)}…`
      : `${place.title} в Нячанге. Адрес, контакты и отзывы на Русской карте Нячанга.`;

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/place/${id}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/place/${id}`,
      type: "article",
    },
  };
}

export default async function PlacePage({ params }: Props) {
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) notFound();

  const reviews = await getReviewsByPlace(id);

  return <PlacePageClient place={place} initialReviews={reviews} />;
}
