import { useEffect, useRef } from "react";
import { imageSrc, imageSrcSet } from "../../shared/media";
import type { SiteTheme } from "../../shared/site-model";

export type EditCtx = {
  editable: boolean;
  onEdit?: (blockId: string, path: (string | number)[], value: string) => void;
  onPickImage?: (blockId: string, path: (string | number)[]) => void;
  highlight?: string[];
};

/** クリックで直接書き換えられるテキスト */
export function T({
  ctx,
  blockId,
  path,
  value,
  as = "span",
  className,
  style,
  multiline = false,
}: {
  ctx: EditCtx;
  blockId: string;
  path: (string | number)[];
  value: string;
  as?: any;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const Tag = as;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);

  if (!ctx.editable) {
    return (
      <Tag className={className} style={{ ...style, whiteSpace: multiline ? "pre-wrap" : undefined }}>
        {value}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-editable="1"
      onBlur={(e: any) => {
        const next = e.currentTarget.innerText.replace(/ /g, " ");
        if (next !== value) ctx.onEdit?.(blockId, path, next);
      }}
      onKeyDown={(e: any) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={`${className ?? ""} outline-none rounded-[3px] transition-shadow hover:shadow-[0_0_0_2px_rgba(59,130,246,.45)] focus:shadow-[0_0_0_2px_rgba(59,130,246,.9)] cursor-text`}
      style={{ ...style, whiteSpace: multiline ? "pre-wrap" : undefined }}
    >
      {value}
    </Tag>
  );
}

export function Img({
  ctx,
  blockId,
  path,
  imageKey,
  alt,
  className,
  priority = false,
  sizes = "100vw",
}: {
  ctx: EditCtx;
  blockId: string;
  path: (string | number)[];
  imageKey: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const clickable = ctx.editable && ctx.onPickImage;

  return (
    <div
      className={`${className?.includes("absolute") ? "" : "relative"} ${clickable ? "group cursor-pointer" : ""} ${className ?? ""}`}
      onClick={clickable ? () => ctx.onPickImage!(blockId, path) : undefined}
    >
      {imageKey ? (
        <img
          src={imageSrc(imageKey, priority ? 1920 : 1280)}
          srcSet={imageSrcSet(imageKey)}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...(priority ? { fetchPriority: "high" as const } : {})}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full" style={{ background: "linear-gradient(135deg, var(--s-surface), var(--s-bg))" }} />
      )}
      {clickable && (
        <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/50 text-white text-xs tracking-wider">
          クリックで画像を差し替え
        </div>
      )}
    </div>
  );
}

/** レイアウト種別ごとの見た目の差 */
export const variantStyles = (t: SiteTheme) => {
  const radius = { none: "0px", sm: "4px", md: "10px", lg: "20px" }[t.radius];
  switch (t.layout) {
    case "natural":
      return {
        radius,
        sectionPad: "py-16 md:py-24",
        heroHeight: "h-[86svh] min-h-[520px]",
        heroAlign: "items-center justify-center text-center",
        eyebrow: "text-[11px] tracking-[0.28em] uppercase",
        h1: "text-4xl md:text-6xl font-semibold leading-tight",
        h2: "text-2xl md:text-4xl font-semibold leading-snug",
        overlay: "bg-gradient-to-t from-black/55 via-black/15 to-black/25",
        container: "max-w-6xl",
      };
    case "bold":
      return {
        radius,
        sectionPad: "py-14 md:py-20",
        heroHeight: "h-[80svh] min-h-[480px]",
        heroAlign: "items-start justify-end text-left",
        eyebrow: "text-xs font-bold tracking-[0.18em]",
        h1: "text-5xl md:text-8xl font-extrabold leading-[0.95]",
        h2: "text-3xl md:text-5xl font-extrabold leading-tight",
        overlay: "bg-gradient-to-t from-black/80 via-black/30 to-black/20",
        container: "max-w-6xl",
      };
    default:
      return {
        radius,
        sectionPad: "py-24 md:py-32",
        heroHeight: "h-[100svh] min-h-[560px]",
        heroAlign: "items-center justify-end text-center",
        eyebrow: "text-[11px] tracking-[0.35em] uppercase",
        h1: "text-5xl md:text-7xl font-semibold tracking-wide leading-tight",
        h2: "text-3xl md:text-4xl font-semibold leading-snug",
        overlay: "bg-gradient-to-t from-black/85 via-black/25 to-black/40",
        container: "max-w-6xl",
      };
  }
};

export type V = ReturnType<typeof variantStyles>;
