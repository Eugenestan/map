import type { Metadata } from "next";
import { getPlaceById } from "@/services/places";
import { getReviewsByPlace } from "@/services/reviews";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/ui/json-ld";
import { getPlacePath } from "@/lib/place-url";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { PlacePageClient } from "./client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) return {};

  const title = `${place.title} — ${place.category?.name_ru ?? "место"} в Нячанге`;
  const description =
    place.description
      ? `${place.description.slice(0, 140)}…`
      : `${place.title} в Нячанге. Адрес, контакты и отзывы на Русской карте Нячанга.`;
  const url = `${SITE_URL}${getPlacePath(place)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ru_RU",
      type: "article",
      images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: place.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}

export default async function PlacePage({ params }: Props) {
  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) notFound();

  const reviews = await getReviewsByPlace(place.id);
  const url = `${SITE_URL}${getPlacePath(place)}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: place.title,
          description: place.description || `${place.title} в Нячанге на ${SITE_NAME}.`,
          url,
          telephone: place.phone || undefined,
          address: place.address_text
            ? {
                "@type": "PostalAddress",
                streetAddress: place.address_text,
                addressLocality: "Нячанг",
                addressCountry: "VN",
              }
            : undefined,
          geo: {
            "@type": "GeoCoordinates",
            latitude: place.lat,
            longitude: place.lng,
          },
          openingHours: place.working_hours || undefined,
          sameAs: [place.website, place.telegram?.startsWith("@") ? `https://t.me/${place.telegram.slice(1)}` : place.telegram].filter(Boolean),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
            { "@type": "ListItem", position: 2, name: place.category.name_ru, item: `${SITE_URL}/category/${place.category.slug}` },
            { "@type": "ListItem", position: 3, name: place.title, item: url },
          ],
        }}
      />
      <PlacePageClient place={place} initialReviews={reviews} />
    </>
  );
}
