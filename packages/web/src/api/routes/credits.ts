import { Hono } from "hono";
import { getBalance, getLedger } from "../lib/credits";

export const credits = new Hono().get("/", async (c) => {
  return c.json({ balance: await getBalance(), ledger: await getLedger() }, 200);
});
