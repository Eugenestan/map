import type { MetadataRoute } from "next";
import { getPlaces } from "@/services/places";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nhatrang.guide";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  try {
    const places = await getPlaces({});
    const placeRoutes: MetadataRoute.Sitemap = places.map((place) => ({
      url: `${siteUrl}/place/${place.id}`,
      lastModified: place.last_verified_at ? new Date(place.last_verified_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    return [...staticRoutes, ...placeRoutes];
  } catch {
    return staticRoutes;
  }
}
