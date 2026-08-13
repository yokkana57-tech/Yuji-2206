import type { PlaceData } from "../../shared/site-model";

const KEY = () => process.env.GOOGLE_MAPS_API_KEY;

export const isPlacesConfigured = () => Boolean(KEY());

export type PlacesHealth = {
  /** 環境変数にキーがあるか */
  configured: boolean;
  /** 実際に Places API を叩いて成功したか */
  ok: boolean;
  error?: string;
  checkedAt?: string;
};

let healthCache: { key: string; value: PlacesHealth } | null = null;

/**
 * キーが「入っているか」だけでなく「実際に使えるか」を1度だけ検証してキャッシュする。
 * Places API が未有効／キー種別違いのときに、UI で正しく案内するために使う。
 */
export async function placesHealth(force = false): Promise<PlacesHealth> {
  const key = KEY();
  if (!key) return { configured: false, ok: false, error: "GOOGLE_MAPS_API_KEY が設定されていません" };
  if (!force && healthCache?.key === key) return healthCache.value;

  let value: PlacesHealth;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
      body: JSON.stringify({ textQuery: "東京駅", languageCode: "ja", regionCode: "JP", maxResultCount: 1 }),
    });
    if (res.ok) {
      value = { configured: true, ok: true, checkedAt: new Date().toISOString() };
    } else {
      const body = await res.text();
      value = { configured: true, ok: false, checkedAt: new Date().toISOString(), error: explainPlacesError(res.status, body) };
    }
  } catch (e: any) {
    value = { configured: true, ok: false, checkedAt: new Date().toISOString(), error: e?.message ?? "接続に失敗しました" };
  }

  healthCache = { key, value };
  return value;
}

function explainPlacesError(status: number, body: string): string {
  const b = body.slice(0, 400);
  if (/API keys are not supported by this API/i.test(b))
    return "このキーでは Places API を呼べません。Google Cloud で『Places API (New)』を有効化し、種別が「APIキー」の認証情報（AIza… で始まるもの）を使ってください。";
  if (status === 403 && /SERVICE_DISABLED|has not been used|is disabled/i.test(b))
    return "Google Cloud プロジェクトで『Places API (New)』が有効になっていません。有効化してから数分待って再試行してください。";
  if (status === 403 && /API_KEY_HTTP_REFERRER|referer|IP/i.test(b))
    return "キーに「HTTPリファラ／IP制限」がかかっています。サーバーから呼ぶため、制限なし（またはAPI制限のみ）のキーが必要です。";
  if (status === 400 && /API key not valid/i.test(b)) return "APIキーが無効です。値をもう一度確認してください。";
  return `Places API ${status}: ${b}`;
}

/** テキスト検索で店舗を1件特定し、詳細情報を取得する */
export async function lookupPlace(query: string): Promise<PlaceData | null> {
  const key = KEY();
  if (!key) return null;

  const fields = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.rating",
    "places.userRatingCount",
    "places.googleMapsUri",
    "places.websiteUri",
    "places.nationalPhoneNumber",
    "places.currentOpeningHours.openNow",
    "places.regularOpeningHours.weekdayDescriptions",
    "places.reviews",
  ].join(",");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fields,
    },
    body: JSON.stringify({ textQuery: query, languageCode: "ja", regionCode: "JP", maxResultCount: 1 }),
  });

  if (!res.ok) {
    throw new Error(`Places API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const json = (await res.json()) as any;
  const p = json.places?.[0];
  if (!p) return null;

  return {
    placeId: p.id,
    name: p.displayName?.text,
    formattedAddress: p.formattedAddress,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    googleMapsUri: p.googleMapsUri,
    websiteUri: p.websiteUri,
    phone: p.nationalPhoneNumber,
    openNow: p.currentOpeningHours?.openNow,
    weekdayDescriptions: p.regularOpeningHours?.weekdayDescriptions,
    reviews: (p.reviews ?? []).slice(0, 4).map((r: any) => ({
      author: r.authorAttribution?.displayName ?? "Google ユーザー",
      rating: r.rating ?? 0,
      text: r.text?.text ?? r.originalText?.text ?? "",
      time: r.relativePublishTimeDescription,
    })),
    fetchedAt: new Date().toISOString(),
  };
}
