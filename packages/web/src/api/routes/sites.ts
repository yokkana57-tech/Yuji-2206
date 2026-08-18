import { Hono } from "hono";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../database";
import { sites, sitePages, pageViews, conversions, editHistory, reservations } from "../database/schema";
import { generateSiteContent, generateStorePhoto, buildPages, type GenerationInput } from "../agent/site-generator";
import { aiEditBlocks } from "../agent/site-editor";
import { consumeCredit, refundCredit, getBalance } from "../lib/credits";
import { lookupPlace, isPlacesConfigured } from "../lib/places";
import { BUSINESS_CATEGORIES, type PageBlock, type SiteTheme } from "../../shared/site-model";

const categoryLabel = (v: string) => BUSINESS_CATEGORIES.find((c) => c.value === v)?.label ?? "店舗";

/** バックグラウンドで生成を進める */
async function runGeneration(siteId: number, input: GenerationInput, uploadedImageKeys: string[]) {
  try {
    await db.update(sites).set({ generationStatus: "writing" }).where(eq(sites.id, siteId));
    const content = await generateSiteContent(input);

    await db
      .update(sites)
      .set({
        generationStatus: "imaging",
        theme: content.theme,
        tagline: content.tagline,
        about: content.about,
        highlights: content.highlights.map((h) => h.title),
        offerings: content.menuCategories.flatMap((c) => c.items).map((i) => ({ name: i.name, description: i.description, price: i.price })),
      })
      .where(eq(sites.id, siteId));

    // 画像：アップロード優先、足りない分をAI生成
    let heroImageKey: string | null = uploadedImageKeys[0] ?? null;
    let gallery: string[] = uploadedImageKeys.slice(1);
    let imageGenerated = false;

    if (uploadedImageKeys.length === 0) {
      const subjects = content.photoSubjects.slice(0, 2);
      const results = await Promise.allSettled(
        subjects.map((subject) => generateStorePhoto({ subject, style: content.photoStyle, address: input.address })),
      );
      const keys = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      heroImageKey = keys[0] ?? null;
      gallery = keys.slice(1);
      imageGenerated = keys.length > 0;
    }

    // Google Places（キーがあれば）
    let placeData = null;
    let placeId: string | null = null;
    try {
      placeData = await lookupPlace(`${input.businessName} ${input.address}`);
      placeId = placeData?.placeId ?? null;
    } catch {
      placeData = null;
    }

    const pages = buildPages({ content, input, heroImageKey, galleryImageKeys: gallery });

    // レビューブロックにPlacesの口コミを流し込む
    if (placeData?.reviews?.length) {
      for (const p of pages) {
        p.blocks = p.blocks.map((b) => (b.type === "reviews" ? { ...b, items: placeData!.reviews! } : b));
      }
    } else {
      for (const p of pages) p.blocks = p.blocks.filter((b) => b.type !== "reviews");
    }

    await db.delete(sitePages).where(eq(sitePages.siteId, siteId));
    await db.insert(sitePages).values(pages.map((p) => ({ siteId, kind: p.kind, title: p.title, blocks: p.blocks, order: p.order })));

    await db
      .update(sites)
      .set({
        generationStatus: "ready",
        status: "published",
        heroImageKey,
        galleryImageKeys: gallery,
        imageGenerated,
        placeData,
        placeId,
        mapPlaceQuery: `${input.businessName} ${input.address}`,
        hours: input.hours || placeData?.weekdayDescriptions?.join(" / ") || "",
        updatedAt: new Date(),
      })
      .where(eq(sites.id, siteId));
  } catch (e) {
    await db
      .update(sites)
      .set({ generationStatus: "failed", generationError: e instanceof Error ? e.message : String(e) })
      .where(eq(sites.id, siteId));
    await refundCredit(siteId, "生成失敗のため返却");
  }
}

async function snapshot(siteId: number, label: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  const pages = await db.select().from(sitePages).where(eq(sitePages.siteId, siteId));
  await db.insert(editHistory).values({
    siteId,
    label,
    snapshot: { pages: pages.map((p) => ({ kind: p.kind, blocks: p.blocks })), theme: site?.theme ?? null },
  });
  // 直近20件だけ保持
  const old = await db.select({ id: editHistory.id }).from(editHistory).where(eq(editHistory.siteId, siteId)).orderBy(desc(editHistory.createdAt)).limit(100).offset(20);
  if (old.length) await db.delete(editHistory).where(inArray(editHistory.id, old.map((o) => o.id)));
}

export const sitesRoute = new Hono()
  // 一覧（指標つき）
  .get("/", async (c) => {
    const rows = await db.select().from(sites).orderBy(desc(sites.updatedAt)).limit(200);
    const ids = rows.map((r) => r.id);

    const views = ids.length
      ? await db
          .select({ siteId: pageViews.siteId, pv: sql<number>`count(*)`, visitors: sql<number>`count(distinct ${pageViews.visitorId})` })
          .from(pageViews)
          .where(inArray(pageViews.siteId, ids))
          .groupBy(pageViews.siteId)
      : [];
    const convs = ids.length
      ? await db
          .select({ siteId: conversions.siteId, n: sql<number>`count(*)` })
          .from(conversions)
          .where(inArray(conversions.siteId, ids))
          .groupBy(conversions.siteId)
      : [];

    const resv = ids.length
      ? await db
          .select({
            siteId: reservations.siteId,
            total: sql<number>`count(*)`,
            fresh: sql<number>`sum(case when ${reservations.status} = 'new' then 1 else 0 end)`,
          })
          .from(reservations)
          .where(inArray(reservations.siteId, ids))
          .groupBy(reservations.siteId)
      : [];

    const vMap = new Map(views.map((v) => [v.siteId, v]));
    const cMap = new Map(convs.map((v) => [v.siteId, v.n]));
    const rMap = new Map(resv.map((v) => [v.siteId, v]));

    return c.json(
      {
        sites: rows.map((r) => {
          const pv = vMap.get(r.id)?.pv ?? 0;
          const conv = cMap.get(r.id) ?? 0;
          return {
            ...r,
            metrics: {
              pv,
              visitors: vMap.get(r.id)?.visitors ?? 0,
              conversions: conv,
              cvr: pv ? Math.round((conv / pv) * 1000) / 10 : 0,
              reservations: rMap.get(r.id)?.total ?? 0,
              newReservations: rMap.get(r.id)?.fresh ?? 0,
            },
          };
        }),
        balance: await getBalance(),
        placesConfigured: isPlacesConfigured(),
      },
      200,
    );
  })

  // 生成（クレジット消費はここだけ）
  .post("/generate", async (c) => {
    const body = await c.req.json<{
      businessName: string;
      businessCategory: string;
      address: string;
      phone?: string;
      hours?: string;
      closedDays?: string;
      targetAudience?: string;
      strengths?: string;
      mood: string;
      offerings: { name: string; price?: string; description?: string }[];
      imageKeys?: string[];
    }>();

    if (!body.businessName?.trim() || !body.address?.trim()) {
      return c.json({ error: "店名と住所は必須です" }, 400);
    }

    const credit = await consumeCredit(`${body.businessName} のサイト生成`);
    if (!credit.ok) return c.json({ error: "クレジット残高が足りません", balance: credit.balance }, 402);

    const slug = nanoid(8);
    const [row] = await db
      .insert(sites)
      .values({
        slug,
        businessName: body.businessName.trim(),
        businessCategory: body.businessCategory,
        businessType: ["salon", "retail", "other"].includes(body.businessCategory) ? "company" : "restaurant",
        address: body.address.trim(),
        phone: body.phone || null,
        hours: body.hours || null,
        closedDays: body.closedDays || null,
        targetAudience: body.targetAudience || null,
        strengths: body.strengths || null,
        mood: body.mood || "おまかせ",
        inputOfferings: body.offerings ?? [],
        generationStatus: "writing",
      })
      .returning();

    const input: GenerationInput = {
      businessName: row.businessName,
      businessCategory: row.businessCategory,
      categoryLabel: categoryLabel(row.businessCategory),
      address: row.address,
      phone: row.phone,
      hours: row.hours,
      closedDays: row.closedDays,
      targetAudience: row.targetAudience,
      strengths: row.strengths,
      mood: row.mood,
      offerings: body.offerings ?? [],
    };

    void runGeneration(row.id, input, body.imageKeys ?? []);

    return c.json({ slug: row.slug, id: row.id, balance: await getBalance() }, 200);
  })

  // 1件取得（ページ込み）
  .get("/:slug", async (c) => {
    const [site] = await db.select().from(sites).where(eq(sites.slug, c.req.param("slug")));
    if (!site) return c.json({ error: "not found" }, 404);
    const pages = await db.select().from(sitePages).where(eq(sitePages.siteId, site.id)).orderBy(sitePages.order);
    return c.json({ site, pages }, 200);
  })

  .get("/:slug/status", async (c) => {
    const [site] = await db
      .select({ status: sites.generationStatus, error: sites.generationError, slug: sites.slug })
      .from(sites)
      .where(eq(sites.slug, c.req.param("slug")));
    if (!site) return c.json({ error: "not found" }, 404);
    return c.json(site, 200);
  })

  // 店舗情報の更新（クレジット消費なし）
  .patch("/:slug", async (c) => {
    const [site] = await db.select().from(sites).where(eq(sites.slug, c.req.param("slug")));
    if (!site) return c.json({ error: "not found" }, 404);
    const body = await c.req.json<Partial<{ businessName: string; address: string; phone: string; instagramUrl: string; facebookUrl: string; tiktokUrl: string; hours: string; closedDays: string; status: string; theme: SiteTheme }>>();
    await db.update(sites).set({ ...body, updatedAt: new Date() }).where(eq(sites.id, site.id));
    const [updated] = await db.select().from(sites).where(eq(sites.id, site.id));
    return c.json({ site: updated }, 200);
  })

  // ブロック更新（手動編集。クレジット消費なし）
  .patch("/:slug/pages/:kind", async (c) => {
    const [site] = await db.select().from(sites).where(eq(sites.slug, c.req.param("slug")));
    if (!site) return c.json({ error: "not found" }, 404);
    const { blocks } = await c.req.json<{ blocks: PageBlock[] }>();

    await snapshot(site.id, "手動編集");
    await db
      .update(sitePages)
      .set({ blocks, updatedAt: new Date() })
      .where(and(eq(sitePages.siteId, site.id), eq(sitePages.kind, c.req.param("kind"))));
    await db.update(sites).set({ updatedAt: new Date() }).where(eq(sites.id, site.id));

    return c.json({ ok: true }, 200);
  })

  // AIチャット編集（クレジット消費なし）
  .post("/:slug/ai-edit", async (c) => {
    const [site] = await db.select().from(sites).where(eq(sites.slug, c.req.param("slug")));
    if (!site) return c.json({ error: "not found" }, 404);
    const { instruction, pageKind } = await c.req.json<{ instruction: string; pageKind: string }>();
    if (!instruction?.trim()) return c.json({ error: "指示を入力してください" }, 400);

    const [page] = await db
      .select()
      .from(sitePages)
      .where(and(eq(sitePages.siteId, site.id), eq(sitePages.kind, pageKind)));
    if (!page) return c.json({ error: "page not found" }, 404);

    try {
      const result = await aiEditBlocks({
        instruction,
        blocks: page.blocks,
        theme: site.theme,
        businessName: site.businessName,
        categoryLabel: categoryLabel(site.businessCategory),
      });
      return c.json({ ...result }, 200);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "AI編集に失敗しました" }, 500);
    }
  })

  // AI編集の適用
  .post("/:slug/apply", async (c) => {
    const [site] = await db.select().from(sites).where(eq(sites.slug, c.req.param("slug")));
    if (!site) return c.json({ error: "not found" }, 404);
    const { pageKind, blocks, theme } = await c.req.json<{ pageKind: string; blocks: PageBlock[]; theme?: SiteTheme | null }>();

    await snapshot(site.id, "AI編集");
    await db
      .update(sitePages)
      .set({ blocks, updatedAt: new Date() })
      .where(and(eq(sitePages.siteId, site.id), eq(sitePages.kind, pageKind)));
    if (theme) await db.update(sites).set({ theme, updatedAt: new Date() }).where(eq(sites.id, site.id));
    else await db.update(sites).set({ updatedAt: new Date() }).where(eq(sites.id, site.id));

    return c.json({ ok: true }, 200);
  })

  // 直前の状態に戻す
  .post("/:slug/undo", async (c) => {
    const [site] = await db.select().from(sites).where(eq(sites.slug, c.req.param("slug")));
    if (!site) return c.json({ error: "not found" }, 404);
    const [last] = await db.select().from(editHistory).where(eq(editHistory.siteId, site.id)).orderBy(desc(editHistory.createdAt)).limit(1);
    if (!last) return c.json({ error: "戻せる履歴がありません" }, 400);

    for (const p of last.snapshot.pages) {
      await db
        .update(sitePages)
        .set({ blocks: p.blocks, updatedAt: new Date() })
        .where(and(eq(sitePages.siteId, site.id), eq(sitePages.kind, p.kind)));
    }
    if (last.snapshot.theme) await db.update(sites).set({ theme: last.snapshot.theme }).where(eq(sites.id, site.id));
    await db.delete(editHistory).where(eq(editHistory.id, last.id));

    return c.json({ ok: true, label: last.label }, 200);
  })

  // Google Places 再取得
  .post("/:slug/refresh-place", async (c) => {
    const [site] = await db.select().from(sites).where(eq(sites.slug, c.req.param("slug")));
    if (!site) return c.json({ error: "not found" }, 404);
    if (!isPlacesConfigured()) return c.json({ error: "GOOGLE_MAPS_API_KEY が未設定です" }, 400);

    const body = await c.req.json<{ query?: string }>().catch(() => ({ query: undefined }));
    const query = body.query || site.mapPlaceQuery || `${site.businessName} ${site.address}`;

    try {
      const placeData = await lookupPlace(query);
      if (!placeData) return c.json({ error: "該当する店舗が見つかりませんでした" }, 404);

      await db
        .update(sites)
        .set({ placeData, placeId: placeData.placeId ?? null, mapPlaceQuery: query, updatedAt: new Date() })
        .where(eq(sites.id, site.id));

      // 既存のレビューブロックを更新
      if (placeData.reviews?.length) {
        const pages = await db.select().from(sitePages).where(eq(sitePages.siteId, site.id));
        for (const p of pages) {
          if (p.blocks.some((b) => b.type === "reviews")) {
            await db
              .update(sitePages)
              .set({ blocks: p.blocks.map((b) => (b.type === "reviews" ? { ...b, items: placeData.reviews! } : b)) })
              .where(eq(sitePages.id, p.id));
          }
        }
      }

      return c.json({ placeData }, 200);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "取得に失敗しました" }, 500);
    }
  })

  .delete("/:slug", async (c) => {
    const [site] = await db.select().from(sites).where(eq(sites.slug, c.req.param("slug")));
    if (!site) return c.json({ error: "not found" }, 404);
    await db.delete(sitePages).where(eq(sitePages.siteId, site.id));
    await db.delete(editHistory).where(eq(editHistory.siteId, site.id));
    await db.delete(pageViews).where(eq(pageViews.siteId, site.id));
    await db.delete(conversions).where(eq(conversions.siteId, site.id));
    await db.delete(reservations).where(eq(reservations.siteId, site.id));
    await db.delete(sites).where(eq(sites.id, site.id));
    return c.json({ ok: true }, 200);
  });
