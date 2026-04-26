export type PlaceStatus = "pending" | "approved" | "rejected" | "hidden" | "archived";
export type ReviewStatus = "pending" | "approved" | "rejected" | "hidden";
export type ReportStatus = "pending" | "resolved" | "dismissed";
export type VoteType = "confirm" | "dispute";
export type TagType = "language" | "useful" | "warning" | "service" | "food";
export type ReportReason = "wrong_info" | "spam" | "offensive" | "duplicate" | "nonexistent" | "other";
export type EntityType = "place" | "review";
export type UserRole = "guest" | "user" | "moderator" | "admin";
export type SortOption = "distance" | "popularity" | "newest" | "confirmations";

export interface Category {
  id: string;
  slug: string;
  name_ru: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface Tag {
  id: string;
  slug: string;
  name_ru: string;
  tag_type: TagType;
  is_active: boolean;
  sort_order: number;
}

export interface Place {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  status: PlaceStatus;
  title: string;
  slug: string;
  category_id: string;
  description: string | null;
  address_text: string | null;
  lat: number;
  lng: number;
  google_maps_url: string | null;
  phone: string | null;
  website: string | null;
  telegram: string | null;
  working_hours: string | null;
  is_verified: boolean;
  last_verified_at: string | null;
  source_type: string | null;
  duplicate_of: string | null;
}

export interface PlaceWithDetails extends Place {
  category: Category;
  tags: PlaceTagAggregate[];
  reviews_count: number;
}

export interface PlaceTagAggregate {
  id: string;
  place_id: string;
  tag_id: string;
  tag: Tag;
  confirm_count: number;
  dispute_count: number;
  score: number;
  status: string;
  last_confirmed_at: string | null;
  last_disputed_at: string | null;
}

export interface Review {
  id: string;
  place_id: string;
  user_id: string | null;
  session_id: string | null;
  status: ReviewStatus;
  text: string;
  visit_period: string | null;
  created_at: string;
  updated_at: string;
  likes_count: number;
  author_name: string | null;
}

export interface ReviewWithTags extends Review {
  tags: Tag[];
}

export interface Report {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  reason: ReportReason;
  comment: string | null;
  created_by: string | null;
  session_id: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface PlacePhoto {
  id: string;
  place_id: string;
  storage_path: string;
  created_by: string | null;
  status: string;
  created_at: string;
}

export interface BBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PlacesFilter {
  category?: string;
  tags?: string[];
  verifiedOnly?: boolean;
  hasReviewsOnly?: boolean;
  search?: string;
  bbox?: BBox;
  sort?: SortOption;
  limit?: number;
  offset?: number;
}

export type TrustLevel = "fresh" | "stale" | "disputed";

export interface TrustInfo {
  level: TrustLevel;
  label: string;
  color: string;
}
