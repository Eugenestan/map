import { z, type ZodIssue } from "zod";

/** Без z.number() на «сырых» значениях — иначе Zod даёт англ. «Expected number, received nan». */
function zGeoCoord(min: number, max: number, message: string) {
  return z.custom<number>(
    (v): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max,
    { message },
  );
}

export const addPlaceSchema = z.object({
  title: z.string().min(2, "Название должно быть не менее 2 символов").max(200, "Слишком длинное название"),
  category_id: z.string().min(1, "Выберите категорию"),
  lat: zGeoCoord(-90, 90, "Укажите точку на карте"),
  lng: zGeoCoord(-180, 180, "Укажите точку на карте"),
  address_text: z.string().max(300, "Слишком длинный адрес").optional(),
  description: z.string().max(400, "Описание не длиннее 400 символов").optional(),
  tags: z.array(z.string()).max(10, "Максимум 10 тегов").optional(),
  phone: z.string().max(50).optional(),
  website: z.string().max(300).optional(),
  telegram: z
    .string()
    .max(100, "Максимум 100 символов")
    .optional()
    .refine((s) => !s || !s.trim() || s.trim().startsWith("@"), {
      message: "Telegram: начните с @ (например @username)",
    }),
  working_hours: z.string().max(200).optional(),
  author_name: z.string().max(50).optional(),
});

export type AddPlaceInput = z.infer<typeof addPlaceSchema>;

/** Нормализация JSON POST /api/places: lat/lng из строк/null без NaN перед addPlaceSchema. */
export function normalizePlaceCreateBody(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const o = { ...(raw as Record<string, unknown>) };
  for (const key of ["lat", "lng"] as const) {
    const v = o[key];
    if (v === "" || v === null || v === undefined) {
      delete o[key];
      continue;
    }
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) {
      delete o[key];
      continue;
    }
    o[key] = n;
  }
  return o;
}

/** Сообщение для UI/API: без дублирования, англ. артефакты Zod (NaN и т.п.) — по-русски. */
export function zodIssuesToUserMessage(issues: ZodIssue[]): string {
  const map = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("nan")) return "Укажите точку на карте";
    if (lower.includes("expected number") && (lower.includes("undefined") || lower.includes("null"))) {
      return "Укажите точку на карте";
    }
    return msg;
  };
  const lines = issues.map((i) => map(i.message)).filter(Boolean);
  return [...new Set(lines)].join(" ") || "Проверьте данные формы";
}

export const adminUpdatePlaceSchema = addPlaceSchema.extend({
  status: z.enum(["approved", "hidden", "archived"]),
  is_verified: z.boolean().optional(),
  admin_recommended: z.boolean().optional(),
  place_info: z.string().max(2000, "Поле «Информация о месте» слишком длинное").optional(),
});

export type AdminUpdatePlaceInput = z.infer<typeof adminUpdatePlaceSchema>;

function refineReviewGuestTags(data: { tags: string[] }, ctx: z.RefinementCtx) {
  if (data.tags.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Выберите хотя бы один тег",
      path: ["tags"],
    });
  }
}

export const addReviewSchema = z
  .object({
    place_id: z.string().min(1),
    text: z.string().max(500, "Максимум 500 символов").default(""),
    tags: z.array(z.string()).max(3, "Максимум 3 тега").default([]),
    visit_period: z.string().max(50).optional(),
    author_name: z.string().max(50).optional(),
  })
  .superRefine(refineReviewGuestTags);

export type AddReviewInput = z.infer<typeof addReviewSchema>;

/** Та же форма отзыва без обязательных тегов — для модераторского редактирования. */
export const addReviewStaffFormSchema = z.object({
  place_id: z.string().min(1),
  text: z.string().max(500, "Максимум 500 символов").default(""),
  tags: z.array(z.string()).max(3, "Максимум 3 тега").default([]),
  visit_period: z.string().max(50).optional(),
  author_name: z.string().max(50).optional(),
});

export type AddReviewStaffFormInput = z.infer<typeof addReviewStaffFormSchema>;

export const adminUpdateReviewSchema = z
  .object({
    text: z.string().max(500, "Максимум 500 символов").default(""),
    tags: z.array(z.string()).max(3, "Максимум 3 тега").optional(),
    visit_period: z.string().max(50).optional(),
    author_name: z.string().max(50).optional(),
    status: z.enum(["approved", "hidden", "rejected", "pending"]),
  });

export type AdminUpdateReviewInput = z.infer<typeof adminUpdateReviewSchema>;

export const reportSchema = z
  .object({
    entity_type: z.enum(["place", "review"]),
    entity_id: z.string().min(1),
    reason: z.enum(["wrong_info", "spam", "offensive", "duplicate", "nonexistent", "other"], {
      required_error: "Выберите причину",
    }),
    comment: z.string().max(500, "Максимум 500 символов").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reason !== "other") return;
    const trimmed = data.comment?.trim() ?? "";
    if (trimmed.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите подробности в комментарии",
        path: ["comment"],
      });
    }
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

export const feedbackTypeSchema = z.enum(["suggestion", "bug_report", "complaint"], {
  required_error: "Выберите тип обращения",
});

export const feedbackSchema = z.object({
  name: z.string().trim().min(2, "Имя не короче 2 символов").max(100, "Слишком длинное имя"),
  email: z.string().trim().email("Некорректный email").max(254, "Слишком длинный email"),
  feedbackType: feedbackTypeSchema,
  message: z
    .string()
    .trim()
    .min(10, "Опишите обращение минимум в 10 символов")
    .max(2000, "Слишком длинное сообщение"),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const createArticleSchema = z.object({
  title: z.string().min(2, "Заголовок должен быть не менее 2 символов").max(200),
  description: z.string().min(10, "Описание должно быть не менее 10 символов").max(5000),
  tag_ids: z.array(z.string()).max(10, "Максимум 10 тегов"),
  photo_urls: z
    .array(
      z.string().max(6000000, "Фото слишком большое. Выберите изображение меньшего размера."),
    )
    .max(5, "Максимум 5 фото"),
  lat: zGeoCoord(-90, 90, "Укажите место на карте"),
  lng: zGeoCoord(-180, 180, "Укажите место на карте"),
  place_id: z.string().optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
