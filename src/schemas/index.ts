import { z } from "zod";

export const addPlaceSchema = z.object({
  title: z.string().min(2, "Название должно быть не менее 2 символов").max(200, "Слишком длинное название"),
  category_id: z.string().min(1, "Выберите категорию"),
  lat: z.number({ required_error: "Укажите точку на карте" }).min(-90).max(90),
  lng: z.number({ required_error: "Укажите точку на карте" }).min(-180).max(180),
  address_text: z.string().max(300, "Слишком длинный адрес").optional(),
  description: z.string().max(1000, "Слишком длинное описание").optional(),
  tags: z.array(z.string()).max(10, "Максимум 10 тегов").optional(),
  phone: z.string().max(50).optional(),
  website: z.string().max(300).optional(),
  telegram: z.string().max(100).optional(),
  working_hours: z.string().max(200).optional(),
  author_name: z.string().max(50).optional(),
});

export type AddPlaceInput = z.infer<typeof addPlaceSchema>;

export const adminUpdatePlaceSchema = addPlaceSchema.extend({
  status: z.enum(["approved", "hidden", "archived"]),
  is_verified: z.boolean().optional(),
});

export type AdminUpdatePlaceInput = z.infer<typeof adminUpdatePlaceSchema>;

export const addReviewSchema = z.object({
  place_id: z.string().min(1),
  text: z.string().min(5, "Отзыв должен быть не менее 5 символов").max(500, "Максимум 500 символов"),
  tags: z.array(z.string()).max(3, "Максимум 3 тега").optional(),
  visit_period: z.string().max(50).optional(),
  author_name: z.string().max(50).optional(),
});

export type AddReviewInput = z.infer<typeof addReviewSchema>;

export const adminUpdateReviewSchema = addReviewSchema.omit({ place_id: true }).extend({
  status: z.enum(["approved", "hidden", "rejected", "pending"]),
});

export type AdminUpdateReviewInput = z.infer<typeof adminUpdateReviewSchema>;

export const reportSchema = z.object({
  entity_type: z.enum(["place", "review"]),
  entity_id: z.string().min(1),
  reason: z.enum(["wrong_info", "spam", "offensive", "duplicate", "nonexistent", "other"], {
    required_error: "Выберите причину",
  }),
  comment: z.string().max(500, "Максимум 500 символов").optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;

export const filtersSchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  verifiedOnly: z.boolean().optional(),
  hasReviewsOnly: z.boolean().optional(),
  search: z.string().optional(),
  sort: z.enum(["distance", "popularity", "newest", "confirmations"]).optional(),
});

export type FiltersInput = z.infer<typeof filtersSchema>;
