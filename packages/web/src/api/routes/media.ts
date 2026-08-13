import { Hono } from "hono";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../lib/s3";
import { storeImageBuffer } from "../lib/images";

export const media = new Hono()
  /** 画像アップロード。サーバー側で WebP 3サイズに最適化して保存する */
  .post("/upload", async (c) => {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return c.json({ error: "file required" }, 400);
    if (file.size > 20 * 1024 * 1024) return c.json({ error: "20MB以下の画像にしてください" }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const key = await storeImageBuffer(buffer, "uploads");
      return c.json({ key }, 200);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "変換に失敗しました" }, 500);
    }
  })

  .get("/view", async (c) => {
    const key = c.req.query("key");
    if (!key) return c.json({ error: "key required" }, 400);

    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }), {
      expiresIn: 3600,
    });

    return c.redirect(url, 302);
  });
