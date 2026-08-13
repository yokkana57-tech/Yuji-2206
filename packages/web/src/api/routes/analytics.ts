import { Hono } from "hono";
import { eq, sql, and, gte } from "drizzle-orm";
import { db } from "../database";
import { sites, pageViews, conversions } from "../database/schema";

export const analytics = new Hono()
  // 計測：ページビュー
  .post("/view", async (c) => {
    const { slug, pageKind, visitorId, path, referrer } = await c.req.json<{
      slug: string;
      pageKind: string;
      visitorId: string;
      path?: string;
      referrer?: string;
    }>();
    const [site] = await db.select({ id: sites.id }).from(sites).where(eq(sites.slug, slug));
    if (!site) return c.json({ ok: false }, 404);
    await db.insert(pageViews).values({ siteId: site.id, pageKind, visitorId, path: path ?? null, referrer: referrer ?? null });
    return c.json({ ok: true }, 200);
  })

  // 計測：予約・問い合わせなどのコンバージョン
  .post("/event", async (c) => {
    const { slug, type, visitorId } = await c.req.json<{ slug: string; type: string; visitorId?: string }>();
    const [site] = await db.select({ id: sites.id }).from(sites).where(eq(sites.slug, slug));
    if (!site) return c.json({ ok: false }, 404);
    await db.insert(conversions).values({ siteId: site.id, type, visitorId: visitorId ?? null });
    return c.json({ ok: true }, 200);
  })

  // 店舗別レポート
  .get("/:slug", async (c) => {
    const days = Number(c.req.query("days") ?? 30);
    const [site] = await db.select().from(sites).where(eq(sites.slug, c.req.param("slug")));
    if (!site) return c.json({ error: "not found" }, 404);

    const since = new Date(Date.now() - days * 86400_000);

    const daily = await db
      .select({
        day: sql<string>`date(${pageViews.createdAt}, 'unixepoch', 'localtime')`,
        pv: sql<number>`count(*)`,
        visitors: sql<number>`count(distinct ${pageViews.visitorId})`,
      })
      .from(pageViews)
      .where(and(eq(pageViews.siteId, site.id), gte(pageViews.createdAt, since)))
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const dailyConv = await db
      .select({ day: sql<string>`date(${conversions.createdAt}, 'unixepoch', 'localtime')`, n: sql<number>`count(*)` })
      .from(conversions)
      .where(and(eq(conversions.siteId, site.id), gte(conversions.createdAt, since)))
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const byPage = await db
      .select({ pageKind: pageViews.pageKind, pv: sql<number>`count(*)` })
      .from(pageViews)
      .where(and(eq(pageViews.siteId, site.id), gte(pageViews.createdAt, since)))
      .groupBy(pageViews.pageKind);

    const byType = await db
      .select({ type: conversions.type, n: sql<number>`count(*)` })
      .from(conversions)
      .where(and(eq(conversions.siteId, site.id), gte(conversions.createdAt, since)))
      .groupBy(conversions.type);

    const convMap = new Map(dailyConv.map((d) => [d.day, d.n]));
    const series = daily.map((d) => ({ day: d.day, pv: d.pv, visitors: d.visitors, conversions: convMap.get(d.day) ?? 0 }));

    const totalPv = series.reduce((s, d) => s + d.pv, 0);
    const totalConv = byType.reduce((s, d) => s + d.n, 0);

    return c.json(
      {
        site: { slug: site.slug, businessName: site.businessName },
        series,
        byPage,
        byType,
        totals: {
          pv: totalPv,
          visitors: series.reduce((s, d) => s + d.visitors, 0),
          conversions: totalConv,
          cvr: totalPv ? Math.round((totalConv / totalPv) * 1000) / 10 : 0,
        },
      },
      200,
    );
  });
