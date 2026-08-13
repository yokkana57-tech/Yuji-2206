import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import type { PageBlock, SiteTheme, PlaceData } from "../../shared/site-model";

/** 旧: 電話営業リード管理（現在UIからは未使用、データ互換のため保持） */
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  phone: text("phone").notNull(),
  nameHint: text("name_hint"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  smsSentAt: integer("sms_sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sites = sqliteTable(
  "sites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leadId: integer("lead_id"),
    slug: text("slug").notNull().unique(),

    // --- 入力情報 ---
    businessName: text("business_name").notNull(),
    /** restaurant | cafe | bar | salon | retail | other */
    businessCategory: text("business_category").notNull().default("restaurant"),
    /** 旧カラム（restaurant | company）。互換のため保持 */
    businessType: text("business_type").notNull().default("restaurant"),
    address: text("address").notNull(),
    phone: text("phone"),
    hours: text("hours"),
    closedDays: text("closed_days"),
    targetAudience: text("target_audience"),
    strengths: text("strengths"),
    /** 和風 / モダン / カジュアル / ナチュラル / 高級 / おまかせ */
    mood: text("mood").notNull().default("おまかせ"),
    inputOfferings: text("input_offerings", { mode: "json" })
      .$type<{ name: string; price?: string; description?: string }[]>()
      .notNull()
      .default([]),

    // --- 生成結果 ---
    tagline: text("tagline").notNull().default(""),
    about: text("about").notNull().default(""),
    highlights: text("highlights", { mode: "json" }).$type<string[]>().notNull().default([]),
    offerings: text("offerings", { mode: "json" })
      .$type<{ name: string; description: string; price?: string }[]>()
      .notNull()
      .default([]),
    theme: text("theme", { mode: "json" }).$type<SiteTheme | null>(),

    // --- 画像 ---
    heroImageKey: text("hero_image_key"),
    galleryImageKeys: text("gallery_image_keys", { mode: "json" }).$type<string[]>(),
    imageGenerated: integer("image_generated", { mode: "boolean" }).notNull().default(false),

    // --- Google マップ ---
    mapPlaceQuery: text("map_place_query"),
    placeId: text("place_id"),
    placeData: text("place_data", { mode: "json" }).$type<PlaceData | null>(),

    /** draft | published */
    status: text("status").notNull().default("draft"),
    generationStatus: text("generation_status").notNull().default("pending"), // pending | writing | imaging | ready | failed
    generationError: text("generation_error"),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("sites_updated_at_idx").on(t.updatedAt)],
);

export const sitePages = sqliteTable(
  "site_pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    siteId: integer("site_id").notNull(),
    /** home | menu | info */
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    blocks: text("blocks", { mode: "json" }).$type<PageBlock[]>().notNull().default([]),
    order: integer("order").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("site_pages_site_idx").on(t.siteId)],
);

/** クレジット台帳。残高 = SUM(amount) */
export const creditLedger = sqliteTable("credit_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  siteId: integer("site_id"),
  /** 消費は -1、初期付与は +50、返却は +1 */
  amount: integer("amount").notNull(),
  /** signup_bonus | generate | refund | topup */
  reason: text("reason").notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const pageViews = sqliteTable(
  "page_views",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    siteId: integer("site_id").notNull(),
    pageKind: text("page_kind").notNull(),
    visitorId: text("visitor_id").notNull(),
    path: text("path"),
    referrer: text("referrer"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("page_views_site_created_idx").on(t.siteId, t.createdAt)],
);

export const conversions = sqliteTable(
  "conversions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    siteId: integer("site_id").notNull(),
    /** reserve_click | tel_click | form_submit | map_click */
    type: text("type").notNull(),
    visitorId: text("visitor_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("conversions_site_created_idx").on(t.siteId, t.createdAt)],
);

/** 公開サイトのフォームから届いた予約・問い合わせ */
export const reservations = sqliteTable(
  "reservations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    siteId: integer("site_id").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    /** 希望日（YYYY-MM-DD） */
    preferredDate: text("preferred_date"),
    /** 希望時間（HH:MM） */
    preferredTime: text("preferred_time"),
    partySize: integer("party_size"),
    message: text("message"),
    /** new | contacted | confirmed | done | canceled */
    status: text("status").notNull().default("new"),
    visitorId: text("visitor_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("reservations_site_created_idx").on(t.siteId, t.createdAt)],
);

export const editHistory = sqliteTable(
  "edit_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    siteId: integer("site_id").notNull(),
    label: text("label").notNull(),
    snapshot: text("snapshot", { mode: "json" })
      .$type<{ pages: { kind: string; blocks: PageBlock[] }[]; theme: SiteTheme | null }>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("edit_history_site_idx").on(t.siteId, t.createdAt)],
);
