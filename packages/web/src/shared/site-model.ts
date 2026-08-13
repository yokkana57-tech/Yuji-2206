/**
 * サイトのコンテンツモデル。
 * ページは「ブロックの配列」で表現する。ブロックは編集の最小単位であり、
 * 手動編集・AIチャット編集・テンプレート差し替えのすべてがこの単位で動く。
 */

export type MenuItem = { name: string; description?: string; price?: string };

export type HeroBlock = {
  id: string;
  type: "hero";
  eyebrow: string;
  headline: string;
  sub: string;
  ctaLabel: string;
  imageKey: string | null;
};

export type AboutBlock = {
  id: string;
  type: "about";
  eyebrow: string;
  heading: string;
  body: string;
  imageKey: string | null;
};

export type HighlightsBlock = {
  id: string;
  type: "highlights";
  eyebrow: string;
  items: { title: string; body: string }[];
};

export type MenuBlock = {
  id: string;
  type: "menu";
  eyebrow: string;
  heading: string;
  note: string;
  categories: { name: string; items: MenuItem[] }[];
};

export type GalleryBlock = {
  id: string;
  type: "gallery";
  eyebrow: string;
  imageKeys: string[];
};

export type InfoBlock = {
  id: string;
  type: "info";
  eyebrow: string;
  heading: string;
  address: string;
  phone: string;
  hours: string;
  closedDays: string;
  access: string;
  mapQuery: string;
};

export type ReviewsBlock = {
  id: string;
  type: "reviews";
  eyebrow: string;
  heading: string;
  items: { author: string; rating: number; text: string; time?: string }[];
};

export type CtaBlock = {
  id: string;
  type: "cta";
  heading: string;
  body: string;
  buttonLabel: string;
};

export type TextBlock = {
  id: string;
  type: "text";
  eyebrow: string;
  heading: string;
  body: string;
};

export type PageBlock =
  | HeroBlock
  | AboutBlock
  | HighlightsBlock
  | MenuBlock
  | GalleryBlock
  | InfoBlock
  | ReviewsBlock
  | CtaBlock
  | TextBlock;

export type PageKind = "home" | "menu" | "info";

export type SiteTheme = {
  /** レイアウトの骨格。elegant=余白広め写真主役 / natural=明るく親しみやすい / bold=大胆な色面 */
  layout: "elegant" | "natural" | "bold";
  bg: string;
  surface: string;
  text: string;
  textDim: string;
  accent: string;
  accentText: string;
  line: string;
  /** Google Fonts の family 名（index.html で読み込み済みのもの） */
  fontHeading: string;
  fontBody: string;
  /** 角丸の強さ */
  radius: "none" | "sm" | "md" | "lg";
  /** 選定理由（ダッシュボード表示用） */
  rationale: string;
};

export type PlaceReview = { author: string; rating: number; text: string; time?: string };

export type PlaceData = {
  placeId?: string;
  name?: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  phone?: string;
  openNow?: boolean;
  weekdayDescriptions?: string[];
  reviews?: PlaceReview[];
  fetchedAt?: string;
};

/** テーマで使えるフォント（index.html で読み込み済み） */
export const ALLOWED_FONTS = [
  "Shippori Mincho",
  "Noto Serif JP",
  "Sawarabi Mincho",
  "Klee One",
  "Zen Kaku Gothic New",
  "Zen Maru Gothic",
  "M PLUS Rounded 1c",
  "Kaisei Decol",
  "Mochiy Pop One",
  "Yomogi",
  "Cormorant Garamond",
  "Playfair Display",
  "DM Serif Display",
  "Jost",
  "Poppins",
] as const;

export const BUSINESS_CATEGORIES = [
  { value: "restaurant", label: "飲食店（レストラン・食堂）" },
  { value: "izakaya", label: "居酒屋・バル" },
  { value: "cafe", label: "カフェ・喫茶店" },
  { value: "bar", label: "バー・スナック" },
  { value: "sushi", label: "寿司・割烹・和食" },
  { value: "ramen", label: "ラーメン・そば・うどん" },
  { value: "bakery", label: "ベーカリー・スイーツ" },
  { value: "salon", label: "美容室・サロン" },
  { value: "retail", label: "小売店・物販" },
  { value: "other", label: "その他" },
] as const;

export const MOODS = ["おまかせ", "和風・落ち着いた", "モダン・洗練", "カジュアル・親しみやすい", "ナチュラル・やわらかい", "高級・上質", "レトロ・懐かしい", "ポップ・元気"] as const;

export const themeToCssVars = (t: SiteTheme): Record<string, string> => ({
  "--s-bg": t.bg,
  "--s-surface": t.surface,
  "--s-text": t.text,
  "--s-text-dim": t.textDim,
  "--s-accent": t.accent,
  "--s-accent-text": t.accentText,
  "--s-line": t.line,
  "--s-font-heading": `"${t.fontHeading}", serif`,
  "--s-font-body": `"${t.fontBody}", sans-serif`,
});

export const DEFAULT_THEME: SiteTheme = {
  layout: "elegant",
  bg: "#0c0b0a",
  surface: "#141210",
  text: "#f3ecdf",
  textDim: "#cfc4ae",
  accent: "#c8a24a",
  accentText: "#0c0b0a",
  line: "rgba(200,162,74,0.35)",
  fontHeading: "Shippori Mincho",
  fontBody: "Zen Kaku Gothic New",
  radius: "none",
  rationale: "既定テーマ",
};
