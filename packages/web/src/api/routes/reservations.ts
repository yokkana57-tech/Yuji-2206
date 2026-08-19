import { Hono } from "hono";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../database";
import { sites, reservations, conversions } from "../database/schema";

const createSchema = z.object({
  name: z.string().trim().min(1, "お名前を入力してください").max(80),
  phone: z.string().trim().min(1, "電話番号を入力してください").max(40),
  email: z.string().trim().max(120).optional().default(""),
  preferredDate: z.string().trim().max(20).optional().default(""),
  preferredTime: z.string().trim().max(20).optional().default(""),
  partySize: z.coerce.number().int().min(1).max(200).optional(),
  message: z.string().trim().max(2000).optional().default(""),
  visitorId: z.string().trim().max(64).optional().default(""),
});

const statusValues = ["new", "contacted", "confirmed", "done", "canceled"] as const;

const siteBySlug = async (slug: string) =>
  (await db.select({ id: sites.id, businessName: sites.businessName }).from(sites).where(eq(sites.slug, slug)).limit(1))[0];

export const reservationsRoute = new Hono()
  /** 公開サイトのフォームから送信（認証なし） */
  .post("/:slug", async (c) => {
    const site = await siteBySlug(c.req.param("slug"));
    if (!site) return c.json({ error: "サイトが見つかりません" }, 404);

    const parsed = createSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" }, 400);
    }
    const b = parsed.data;

    const [row] = await db
      .insert(reservations)
      .values({
        siteId: site.id,
        name: b.name,
        phone: b.phone || null,
        email: b.email || null,
        preferredDate: b.preferredDate || null,
        preferredTime: b.preferredTime || null,
        partySize: b.partySize ?? null,
        message: b.message || null,
        visitorId: b.visitorId || null,
      })
      .returning();

    // ダッシュボードの「予約/問い合わせ」件数に反映させる
    await db.insert(conversions).values({ siteId: site.id, type: "form_submit", visitorId: b.visitorId || null });

    return c.json({ ok: true, id: row.id }, 201);
  })

  /** 店舗ごとの予約一覧（管理用） */
  .get("/:slug", async (c) => {
    const site = await siteBySlug(c.req.param("slug"));
    if (!site) return c.json({ error: "サイトが見つかりません" }, 404);

    const rows = await db
      .select()
      .from(reservations)
      .where(eq(reservations.siteId, site.id))
      .orderBy(desc(reservations.createdAt))
      .limit(500);

    const counts = await db
      .select({ status: reservations.status, n: sql<number>`count(*)` })
      .from(reservations)
      .where(eq(reservations.siteId, site.id))
      .groupBy(reservations.status);

    return c.json({
      site: { slug: c.req.param("slug"), businessName: site.businessName },
      reservations: rows,
      counts: Object.fromEntries(counts.map((r) => [r.status, r.n])),
    });
  })

  /** 対応状況の更新 */
  .patch("/:slug/:id", async (c) => {
    const site = await siteBySlug(c.req.param("slug"));
    if (!site) return c.json({ error: "サイトが見つかりません" }, 404);
    const body = await c.req.json().catch(() => ({}));
    const status = z.enum(statusValues).safeParse(body?.status);
    if (!status.success) return c.json({ error: "status が不正です" }, 400);

    await db
      .update(reservations)
      .set({ status: status.data })
      .where(and(eq(reservations.id, Number(c.req.param("id"))), eq(reservations.siteId, site.id)));
    return c.json({ ok: true });
  })

  .delete("/:slug/:id", async (c) => {
    const site = await siteBySlug(c.req.param("slug"));
    if (!site) return c.json({ error: "サイトが見つかりません" }, 404);
    await db
      .delete(reservations)
      .where(and(eq(reservations.id, Number(c.req.param("id"))), eq(reservations.siteId, site.id)));
    return c.json({ ok: true });
  });
