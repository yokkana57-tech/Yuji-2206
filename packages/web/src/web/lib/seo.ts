import { imageSrc } from "../../shared/media";

const upsert = (selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void) => {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    el.dataset.seoManaged = "1";
    document.head.appendChild(el);
  }
  apply(el);
};

const meta = (name: string, content: string) =>
  upsert(`meta[name="${name}"]`, () => Object.assign(document.createElement("meta"), { name }), (el) =>
    el.setAttribute("content", content),
  );

const prop = (property: string, content: string) =>
  upsert(`meta[property="${property}"]`, () => {
    const el = document.createElement("meta");
    el.setAttribute("property", property);
    return el;
  }, (el) => el.setAttribute("content", content));

const link = (rel: string, href: string) =>
  upsert(`link[rel="${rel}"][data-seo-managed]`, () => {
    const el = document.createElement("link");
    el.setAttribute("rel", rel);
    return el;
  }, (el) => el.setAttribute("href", href));

export type SiteSeo = {
  slug: string;
  businessName: string;
  categoryLabel: string;
  tagline?: string | null;
  about?: string | null;
  address?: string | null;
  phone?: string | null;
  hours?: string | null;
  heroImageKey?: string | null;
  pageTitle?: string | null;
  rating?: number;
  userRatingCount?: number;
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * 公開サイトごとの title / description / OG / JSON-LD をセットする。
 * 1つのデプロイに複数店舗が乗るため、ダッシュボードのSEO設定（サイト全体で1つ）では
 * 店舗ごとの出し分けができない。そこをここで店舗情報から自動生成して補う。
 */
export function applySiteSeo(s: SiteSeo) {
  const nameWithPage = s.pageTitle && s.pageTitle !== "トップ" ? `${s.businessName}｜${s.pageTitle}` : s.businessName;
  const title = clip(`${nameWithPage}｜${s.address ? `${areaOf(s.address)}の` : ""}${s.categoryLabel}`, 60);

  const descParts = [
    s.tagline?.trim(),
    s.address ? `${s.address}の${s.categoryLabel}。` : `${s.categoryLabel}。`,
    s.hours ? `営業時間 ${s.hours}。` : "",
    (s.about ?? "").replace(/\s+/g, " ").trim(),
    "ご予約・お問い合わせはサイト内フォームから承ります。",
  ].filter(Boolean);
  const description = clip(descParts.join(" "), 155);

  document.title = title;
  meta("description", description);
  meta("robots", "index,follow");
  prop("og:type", "website");
  prop("og:site_name", s.businessName);
  prop("og:title", title);
  prop("og:description", description);
  prop("og:url", `${location.origin}/s/${s.slug}`);
  meta("twitter:card", "summary_large_image");
  meta("twitter:title", title);
  meta("twitter:description", description);

  if (s.heroImageKey) {
    const img = `${location.origin}${imageSrc(s.heroImageKey, 1280)}`;
    prop("og:image", img);
    meta("twitter:image", img);
  }
  link("canonical", `${location.origin}/s/${s.slug}`);

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType(s.categoryLabel),
    name: s.businessName,
    description,
    url: `${location.origin}/s/${s.slug}`,
    ...(s.address ? { address: { "@type": "PostalAddress", streetAddress: s.address, addressCountry: "JP" } } : {}),
    ...(s.phone ? { telephone: s.phone } : {}),
    ...(s.hours ? { openingHours: s.hours } : {}),
    ...(s.heroImageKey ? { image: `${location.origin}${imageSrc(s.heroImageKey, 1280)}` } : {}),
    ...(s.rating && s.userRatingCount
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.userRatingCount } }
      : {}),
  };

  let script = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-seo-managed]');
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoManaged = "1";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(ld);
}

/** 「東京都杉並区高円寺南3-45-2」→「杉並区」くらいのざっくり地域名 */
function areaOf(address: string): string {
  const m = address.match(/(.+?[都道府県])?(.+?[市区町村])/);
  return m?.[2] ?? "";
}

function schemaType(categoryLabel: string): string {
  if (/カフェ|喫茶/.test(categoryLabel)) return "CafeOrCoffeeShop";
  if (/居酒屋|バー|飲食|レストラン/.test(categoryLabel)) return "Restaurant";
  if (/美容|サロン|理容/.test(categoryLabel)) return "HealthAndBeautyBusiness";
  if (/物販|小売|ショップ/.test(categoryLabel)) return "Store";
  return "LocalBusiness";
}
