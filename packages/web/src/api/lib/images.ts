import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./s3";

/** 生成する幅（px）。srcset で出し分ける */
export const IMAGE_WIDTHS = [640, 1280, 1920] as const;

const put = async (key: string, body: Buffer, contentType: string) => {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
};

/**
 * 画像バッファを WebP 3サイズに変換して保存する。
 * 返すのはベースキー（拡張子・サイズなし）。配信側で `${base}-640.webp` のように解決する。
 */
export async function storeImageBuffer(buffer: Buffer, prefix: "generated" | "uploads"): Promise<string> {
  const base = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const img = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const srcWidth = meta.width ?? 1920;

  await Promise.all(
    IMAGE_WIDTHS.map(async (w) => {
      const target = Math.min(w, srcWidth);
      const out = await sharp(buffer, { failOn: "none" })
        .rotate()
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: w >= 1920 ? 74 : 78 })
        .toBuffer();
      await put(`${base}-${w}.webp`, out, "image/webp");
    }),
  );

  return base;
}

/** ベースキーかどうか（旧形式の `generated/xxx.png` は false） */
export const isOptimizedKey = (key: string) => !/\.(png|jpe?g|webp|gif|avif)$/i.test(key);

export const imageUrl = (key: string, width: (typeof IMAGE_WIDTHS)[number] = 1280) =>
  isOptimizedKey(key)
    ? `/api/media/view?key=${encodeURIComponent(`${key}-${width}.webp`)}`
    : `/api/media/view?key=${encodeURIComponent(key)}`;
