import { sql, desc } from "drizzle-orm";
import { db } from "../database";
import { creditLedger } from "../database/schema";

export const INITIAL_CREDITS = 50;

export async function ensureSeeded() {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(creditLedger);
  if (!row || row.n === 0) {
    await db.insert(creditLedger).values({ amount: INITIAL_CREDITS, reason: "signup_bonus", note: "初期付与" });
  }
}

export async function getBalance(): Promise<number> {
  await ensureSeeded();
  const [row] = await db.select({ total: sql<number>`coalesce(sum(${creditLedger.amount}), 0)` }).from(creditLedger);
  return row?.total ?? 0;
}

export async function consumeCredit(note: string): Promise<{ ok: true } | { ok: false; balance: number }> {
  const balance = await getBalance();
  if (balance <= 0) return { ok: false, balance };
  await db.insert(creditLedger).values({ amount: -1, reason: "generate", note });
  return { ok: true };
}

export async function refundCredit(siteId: number | null, note: string) {
  await db.insert(creditLedger).values({ amount: 1, reason: "refund", siteId, note });
}

export async function getLedger(limit = 30) {
  return await db.select().from(creditLedger).orderBy(desc(creditLedger.createdAt)).limit(limit);
}
