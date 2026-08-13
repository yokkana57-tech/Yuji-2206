import { generateObject } from "ai";
import dedent from "dedent";
import { z } from "zod";
import { gateway } from "./gateway";
import { ALLOWED_FONTS, type PageBlock, type SiteTheme } from "../../shared/site-model";
import { storeImageBuffer } from "../lib/images";

const nid = () => Math.random().toString(36).slice(2, 10);

const themeSchema = z.object({
  layout: z.enum(["elegant", "natural", "bold"]).describe("elegant=余白広め・写真主役・高級感 / natural=明るく親しみやすい / bold=大胆な色面・元気"),
  bg: z.string().describe("背景色 HEX"),
  surface: z.string().describe("セクション帯の背景色 HEX（bgよりわずかに違う色）"),
  text: z.string().describe("本文・見出しの文字色 HEX（bgとのコントラスト比4.5以上）"),
  textDim: z.string().describe("補足文の文字色 HEX"),
  accent: z.string().describe("アクセント色 HEX（ボタン・ラベル・線）"),
  accentText: z.string().describe("アクセント色の上に乗る文字色 HEX"),
  line: z.string().describe("区切り線の色。rgba() 表記可"),
  fontHeading: z.enum(ALLOWED_FONTS).describe("見出しフォント"),
  fontBody: z.enum(ALLOWED_FONTS).describe("本文フォント"),
  radius: z.enum(["none", "sm", "md", "lg"]),
  rationale: z.string().describe("この配色・フォントを選んだ理由を日本語1文で"),
});

const menuItemSchema = z.object({
  name: z.string(),
  description: z.string().describe("40文字以内の日本語説明"),
  price: z.string().optional().describe("例: ¥1,200"),
});

const contentSchema = z.object({
  photoStyle: z.string().describe("English visual style descriptor for the hero photo, e.g. 'cozy neighborhood cafe, morning daylight, light oak counter, plants'"),
  photoSubjects: z.array(z.string()).length(3).describe("3 English subjects for photos: 1) hero interior/exterior 2) signature product close-up 3) detail/atmosphere shot"),
  theme: themeSchema,
  tagline: z.string().describe("20文字以内の日本語キャッチコピー"),
  heroEyebrow: z.string().describe("ヒーロー上部の小見出し。日本語または短い英語。例: '炭火焼と日本酒' / 'SINCE 1998'"),
  heroSub: z.string().describe("ヒーローのキャッチ下に置く1文（35文字以内）"),
  ctaLabel: z
    .string()
    .describe(
      "メインCTAのラベル。押すとページ下部の予約・お問い合わせフォームへ移動するので、必ず予約か問い合わせを促す文言にすること。例: 'ご予約・お問い合わせ' / '席を予約する' / 'お問い合わせフォームへ'。'場所を確認する' のような案内文言は禁止。",
    ),
  aboutHeading: z.string().describe("紹介セクションの見出し（25文字以内）"),
  about: z.string().describe("紹介文。3〜4文の日本語。地域と強みを具体的に織り込む"),
  highlights: z.array(z.object({ title: z.string().describe("12文字以内"), body: z.string().describe("45文字以内") })).length(3),
  menuHeading: z.string().describe("メニュー/商品ページの見出し"),
  menuNote: z.string().describe("価格に関する注記1文。例: '表示価格は税込です。'"),
  menuCategories: z
    .array(z.object({ name: z.string().describe("カテゴリ名。例: 'おすすめ' '一品料理' 'ドリンク'"), items: z.array(menuItemSchema).min(2).max(8) }))
    .min(2)
    .max(4),
  access: z.string().describe("アクセス案内の1〜2文。最寄り駅や目印を住所から推測して自然に"),
  infoHeading: z.string().describe("店舗情報ページの見出し"),
  ctaHeading: z.string().describe("最下部CTAの見出し（20文字以内）"),
  ctaBody: z.string().describe("最下部CTAの本文（50文字以内）"),
  labels: z.object({
    about: z.string().describe("紹介セクションのラベル。日本語推奨。例: '当店について'"),
    menu: z.string().describe("例: 'お品書き' / 'メニュー' / '取扱商品'"),
    highlights: z.string().describe("例: 'こだわり'"),
    gallery: z.string().describe("例: '店内の様子'"),
    info: z.string().describe("例: '店舗情報'"),
    reviews: z.string().describe("例: 'お客様の声'"),
  }),
});

export type GeneratedContent = z.infer<typeof contentSchema>;

export type GenerationInput = {
  businessName: string;
  businessCategory: string;
  categoryLabel: string;
  address: string;
  phone?: string | null;
  hours?: string | null;
  closedDays?: string | null;
  targetAudience?: string | null;
  strengths?: string | null;
  mood: string;
  offerings: { name: string; price?: string; description?: string }[];
};

export async function generateSiteContent(input: GenerationInput): Promise<GeneratedContent> {
  const offeringsText = input.offerings.length
    ? input.offerings.map((o) => `- ${o.name}${o.price ? ` / ${o.price}` : ""}${o.description ? ` / ${o.description}` : ""}`).join("\n")
    : "（未入力。業種と店名から自然な相場感で創作してください）";

  const { object } = await generateObject({
    model: gateway("anthropic/claude-sonnet-4.6"),
    schema: contentSchema,
    prompt: dedent`
      あなたは日本の店舗を専門にするプロのWebディレクター兼コピーライター兼アートディレクターです。
      以下の店舗情報から、公式サイト（トップ / メニュー / 店舗情報 の3ページ）のコンテンツと、
      その店の雰囲気に合わせた配色・フォント（テーマ）を設計してください。

      # 店舗情報
      店名: ${input.businessName}
      業種: ${input.categoryLabel}
      所在地: ${input.address}
      電話: ${input.phone || "（なし）"}
      営業時間: ${input.hours || "（未入力。業種の一般的な時間帯で自然に補完）"}
      定休日: ${input.closedDays || "（未入力）"}
      ターゲット顧客層: ${input.targetAudience || "（未入力。業種と立地から推測）"}
      強み・こだわり: ${input.strengths || "（未入力。業種から自然に推測）"}
      希望する雰囲気: ${input.mood}
      メニュー・商品:
      ${offeringsText}

      # テーマ設計の指針（最重要）
      「その店だけの雰囲気」を作ってください。テンプレートの使い回しに見えてはいけません。
      - 業種と雰囲気の希望から配色を決める。例:
        炭火焼・和食・寿司 → 深い墨色 × 生成り × 金や朱
        カフェ・ベーカリー → 生成り/オフホワイト × 木目のブラウン × くすんだ緑
        バー・スナック → 濃紺や深緑の暗色 × 真鍮のゴールド
        ラーメン・食堂 → 白または生成り × 赤や黒の力強いアクセント
        美容室・サロン → 明るいグレージュ × モーヴやセージのアクセント
        小売店 → 白 × 商品を邪魔しない低彩度のアクセント1色
      - 暗い背景なら text は明るく、明るい背景なら text は濃く。コントラストは必ず確保する。
      - フォントは指定リストから選ぶ。和の落ち着き=Shippori Mincho / Sawarabi Mincho、
        やわらかい=Zen Maru Gothic / M PLUS Rounded 1c、洗練=Zen Kaku Gothic New / Jost、
        手書き感=Klee One / Yomogi、元気=Mochiy Pop One / Kaisei Decol。
      - 「おまかせ」の場合は業種と立地から最適なものを選ぶこと。

      # 文章の指針
      - 誇張や広告臭さを避け、実在の店として自然な日本語。「至高の」「究極の」などの安っぽい強調語は使わない。
      - 地名や立地を具体的に織り込む。
      - 入力されたメニューは必ず全部使い、説明が空のものには自然な説明を補う。
      - menuCategories は入力メニューを意味のあるカテゴリに分け、必要なら業種に応じた定番品を数点だけ補う。
      - ラベル類は日本語を基本にする（その店の雰囲気に合うなら英語も可）。
    `,
  });

  return object;
}

/** AIで店舗写真を1枚生成し、最適化してS3に保存。キーを返す */
export async function generateStorePhoto(input: { subject: string; style: string; address: string }): Promise<string> {
  const prompt = dedent`
    Generate a single photorealistic, high-end editorial photograph: ${input.subject}.
    Visual style: ${input.style}.
    Natural depth of field, professional hospitality/retail photography, magazine quality, believable Japanese location.
    Absolutely no text, no letters, no signage, no logos, no watermarks, no readable characters anywhere in the image.
    No people's faces in focus. Location context: ${input.address}.
  `;

  // generateText()/generateImage() はこのゲートウェイの raw base64 file part を正しく扱えないため
  // 低レベルの doGenerate を直接呼ぶ。
  const model = gateway("google/gemini-3-pro-image") as any;
  const result = await model.doGenerate({
    prompt: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
  });

  const filePart = (result.content ?? []).find((p: any) => p.type === "file");
  if (!filePart) throw new Error("no image generated");

  return await storeImageBuffer(Buffer.from(filePart.data, "base64"), "generated");
}

/** 生成結果 + 入力から、3ページ分のブロックを組み立てる */
export function buildPages(args: {
  content: GeneratedContent;
  input: GenerationInput;
  heroImageKey: string | null;
  galleryImageKeys: string[];
}): { kind: "home" | "menu" | "info"; title: string; order: number; blocks: PageBlock[] }[] {
  const { content: c, input, heroImageKey, galleryImageKeys } = args;
  const secondary = galleryImageKeys[0] ?? heroImageKey;

  const infoBlock: PageBlock = {
    id: nid(),
    type: "info",
    eyebrow: c.labels.info,
    heading: c.infoHeading,
    address: input.address,
    phone: input.phone ?? "",
    hours: input.hours ?? "",
    closedDays: input.closedDays ?? "",
    access: c.access,
    mapQuery: `${input.businessName} ${input.address}`,
  };

  const ctaBlock: PageBlock = {
    id: nid(),
    type: "cta",
    heading: c.ctaHeading,
    body: c.ctaBody,
    buttonLabel: c.ctaLabel,
  };

  const home: PageBlock[] = [
    { id: nid(), type: "hero", eyebrow: c.heroEyebrow, headline: input.businessName, sub: c.tagline, ctaLabel: c.ctaLabel, imageKey: heroImageKey },
    { id: nid(), type: "about", eyebrow: c.labels.about, heading: c.aboutHeading, body: c.about, imageKey: secondary },
    { id: nid(), type: "highlights", eyebrow: c.labels.highlights, items: c.highlights },
    {
      id: nid(),
      type: "menu",
      eyebrow: c.labels.menu,
      heading: c.menuHeading,
      note: c.menuNote,
      categories: c.menuCategories.slice(0, 1),
    },
    ...(galleryImageKeys.length >= 2 ? [{ id: nid(), type: "gallery" as const, eyebrow: c.labels.gallery, imageKeys: galleryImageKeys }] : []),
    { id: nid(), type: "reviews", eyebrow: c.labels.reviews, heading: "Googleでの評価", items: [] },
    infoBlock,
    ctaBlock,
  ];

  const menu: PageBlock[] = [
    { id: nid(), type: "hero", eyebrow: c.labels.menu, headline: c.menuHeading, sub: c.menuNote, ctaLabel: c.ctaLabel, imageKey: secondary },
    { id: nid(), type: "menu", eyebrow: c.labels.menu, heading: c.menuHeading, note: c.menuNote, categories: c.menuCategories },
    ctaBlock,
  ];

  const info: PageBlock[] = [
    { id: nid(), type: "hero", eyebrow: c.labels.info, headline: c.infoHeading, sub: c.access, ctaLabel: c.ctaLabel, imageKey: heroImageKey },
    infoBlock,
    { id: nid(), type: "reviews", eyebrow: c.labels.reviews, heading: "Googleでの評価", items: [] },
    ctaBlock,
  ];

  return [
    { kind: "home", title: "トップ", order: 0, blocks: home },
    { kind: "menu", title: c.labels.menu, order: 1, blocks: menu },
    { kind: "info", title: c.labels.info, order: 2, blocks: info },
  ];
}

export function themeFrom(c: GeneratedContent): SiteTheme {
  return c.theme;
}
