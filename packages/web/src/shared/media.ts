export const IMAGE_WIDTHS = [640, 1280, 1920] as const;

/** 旧形式（拡張子つき）かどうか */
const isLegacy = (key: string) => /\.(png|jpe?g|webp|gif|avif)$/i.test(key);

export const mediaUrl = (key: string) => `/api/media/view?key=${encodeURIComponent(key)}`;

export const imageSrc = (key: string, width: (typeof IMAGE_WIDTHS)[number] = 1280) =>
  isLegacy(key) ? mediaUrl(key) : mediaUrl(`${key}-${width}.webp`);

export const imageSrcSet = (key: string) =>
  isLegacy(key) ? undefined : IMAGE_WIDTHS.map((w) => `${mediaUrl(`${key}-${w}.webp`)} ${w}w`).join(", ");
