import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { MapPin, Phone, Clock, CalendarX2, Star, ExternalLink, Navigation, CalendarCheck, Instagram, Facebook } from "lucide-react";
import { themeToCssVars, type PageBlock, type SiteTheme, type PlaceData } from "../../shared/site-model";
import { T, Img, variantStyles, type EditCtx, type V } from "./parts";

const noopCtx: EditCtx = { editable: false };

/** lucide-react に TikTok アイコンが無いため、同じ流儀で自作したもの */
function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82c-.9-.85-1.42-2.02-1.42-3.32h-3.05v13.79c0 1.5-1.22 2.71-2.71 2.71a2.71 2.71 0 0 1 0-5.42c.28 0 .55.04.8.12V10.6a5.9 5.9 0 0 0-.8-.05A5.77 5.77 0 1 0 15.15 16.2V9.36a8.53 8.53 0 0 0 4.9 1.55V7.86a5.2 5.2 0 0 1-3.45-2.04Z" />
    </svg>
  );
}

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

function Eyebrow({ v, children }: { v: V; children: React.ReactNode }) {
  return <div className={`${v.eyebrow} mb-4`} style={{ color: "var(--s-accent)" }}>{children}</div>;
}

function Block({
  block,
  v,
  ctx,
  place,
  onTrack,
  isFirst,
}: {
  block: PageBlock;
  v: V;
  ctx: EditCtx;
  place: PlaceData | null;
  onTrack: (type: string) => void;
  isFirst: boolean;
}) {
  const hi = ctx.highlight?.includes(block.id);
  const wrap = (node: React.ReactNode) => (
    <div className={hi ? "relative ring-2 ring-blue-400/80 ring-offset-0" : undefined}>
      {hi && <span className="absolute z-20 -top-3 left-3 text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded">変更</span>}
      {node}
    </div>
  );

  switch (block.type) {
    case "hero":
      return wrap(
        <section className={`relative w-full overflow-hidden ${isFirst ? v.heroHeight : "h-[52svh] min-h-[340px]"}`}>
          <Img ctx={ctx} blockId={block.id} path={["imageKey"]} imageKey={block.imageKey} alt={block.headline} className="absolute inset-0" priority={isFirst} />
          <div className={`absolute inset-0 pointer-events-none ${v.overlay}`} />
          <div className={`relative z-10 h-full flex flex-col px-6 md:px-12 pb-20 ${v.heroAlign}`}>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="max-w-3xl">
              <T ctx={ctx} blockId={block.id} path={["eyebrow"]} value={block.eyebrow} as="div" className={`${v.eyebrow} mb-4`} style={{ color: "var(--s-accent)" }} />
              <T ctx={ctx} blockId={block.id} path={["headline"]} value={block.headline} as="h1" className={v.h1} style={{ color: "#fff", fontFamily: "var(--s-font-heading)" }} />
              <div className="w-14 h-px my-6 mx-auto" style={{ background: "var(--s-accent)", marginLeft: v.heroAlign.includes("text-left") ? 0 : undefined }} />
              <T ctx={ctx} blockId={block.id} path={["sub"]} value={block.sub} as="p" className="text-lg md:text-2xl" style={{ color: "rgba(255,255,255,.88)" }} />
            </motion.div>
          </div>
        </section>,
      );

    case "about":
      return wrap(
        <section className={`${v.container} mx-auto px-6 md:px-12 ${v.sectionPad} grid md:grid-cols-2 gap-12 items-center`}>
          <motion.div {...reveal}>
            <T ctx={ctx} blockId={block.id} path={["eyebrow"]} value={block.eyebrow} as="div" className={`${v.eyebrow} mb-4`} style={{ color: "var(--s-accent)" }} />
            <T ctx={ctx} blockId={block.id} path={["heading"]} value={block.heading} as="h2" className={`${v.h2} mb-6`} style={{ fontFamily: "var(--s-font-heading)" }} />
            <T ctx={ctx} blockId={block.id} path={["body"]} value={block.body} as="p" multiline className="leading-loose text-[15px]" style={{ color: "var(--s-text-dim)" }} />
          </motion.div>
          <motion.div {...reveal} className="relative aspect-[4/5] overflow-hidden" style={{ borderRadius: v.radius }}>
            <Img ctx={ctx} blockId={block.id} path={["imageKey"]} imageKey={block.imageKey} alt="" className="absolute inset-0" sizes="(max-width:768px) 100vw, 50vw" />
          </motion.div>
        </section>,
      );

    case "highlights":
      return wrap(
        <section style={{ background: "var(--s-surface)", borderTop: "1px solid var(--s-line)", borderBottom: "1px solid var(--s-line)" }}>
          <div className={`max-w-5xl mx-auto px-6 md:px-12 ${v.sectionPad} text-center`}>
            <T ctx={ctx} blockId={block.id} path={["eyebrow"]} value={block.eyebrow} as="div" className={`${v.eyebrow} mb-10`} style={{ color: "var(--s-accent)" }} />
            <div className="grid sm:grid-cols-3 gap-10">
              {block.items.map((item, i) => (
                <motion.div key={i} {...reveal} transition={{ duration: 0.5, delay: i * 0.12 }}>
                  <div className="text-2xl mb-3" style={{ color: "var(--s-accent)", fontFamily: "var(--s-font-heading)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <T ctx={ctx} blockId={block.id} path={["items", i, "title"]} value={item.title} as="h3" className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--s-font-heading)" }} />
                  <T ctx={ctx} blockId={block.id} path={["items", i, "body"]} value={item.body} as="p" className="text-sm leading-relaxed" style={{ color: "var(--s-text-dim)" }} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>,
      );

    case "menu":
      return wrap(
        <section className={`max-w-3xl mx-auto px-6 md:px-12 ${v.sectionPad}`}>
          <motion.div {...reveal} className="text-center mb-12">
            <T ctx={ctx} blockId={block.id} path={["eyebrow"]} value={block.eyebrow} as="div" className={`${v.eyebrow} mb-3`} style={{ color: "var(--s-accent)" }} />
            <T ctx={ctx} blockId={block.id} path={["heading"]} value={block.heading} as="h2" className={v.h2} style={{ fontFamily: "var(--s-font-heading)" }} />
          </motion.div>

          <div className="space-y-12">
            {block.categories.map((cat, ci) => (
              <div key={ci}>
                <T
                  ctx={ctx}
                  blockId={block.id}
                  path={["categories", ci, "name"]}
                  value={cat.name}
                  as="h3"
                  className="text-sm tracking-[0.2em] mb-6 pb-2"
                  style={{ color: "var(--s-accent)", borderBottom: "1px solid var(--s-line)" }}
                />
                <div className="space-y-6">
                  {cat.items.map((item, ii) => (
                    <motion.div key={ii} {...reveal} transition={{ duration: 0.4, delay: ii * 0.05 }}>
                      <div className="flex items-baseline gap-3">
                        <T ctx={ctx} blockId={block.id} path={["categories", ci, "items", ii, "name"]} value={item.name} className="text-lg font-medium whitespace-nowrap" style={{ fontFamily: "var(--s-font-heading)" }} />
                        <span className="flex-1 border-b border-dotted -translate-y-1" style={{ borderColor: "var(--s-line)" }} />
                        {item.price !== undefined && (
                          <T ctx={ctx} blockId={block.id} path={["categories", ci, "items", ii, "price"]} value={item.price} className="font-medium whitespace-nowrap" style={{ color: "var(--s-accent)" }} />
                        )}
                      </div>
                      {item.description !== undefined && (
                        <T ctx={ctx} blockId={block.id} path={["categories", ci, "items", ii, "description"]} value={item.description} as="p" className="text-sm mt-1.5" style={{ color: "var(--s-text-dim)" }} />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <T ctx={ctx} blockId={block.id} path={["note"]} value={block.note} as="p" className="text-xs mt-10 text-center" style={{ color: "var(--s-text-dim)" }} />
        </section>,
      );

    case "gallery":
      return wrap(
        <section className={`${v.container} mx-auto px-6 md:px-12 ${v.sectionPad}`}>
          <Eyebrow v={v}>{block.eyebrow}</Eyebrow>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {block.imageKeys.map((k, i) => (
              <motion.div key={i} {...reveal} transition={{ duration: 0.5, delay: i * 0.08 }} className="aspect-square overflow-hidden" style={{ borderRadius: v.radius }}>
                <Img ctx={ctx} blockId={block.id} path={["imageKeys", i]} imageKey={k} alt="" className="w-full h-full" sizes="(max-width:768px) 50vw, 33vw" />
              </motion.div>
            ))}
          </div>
        </section>,
      );

    case "reviews": {
      const items = block.items.length ? block.items : place?.reviews ?? [];
      if (!items.length && !place?.rating) return null;
      return wrap(
        <section style={{ background: "var(--s-surface)", borderTop: "1px solid var(--s-line)", borderBottom: "1px solid var(--s-line)" }}>
          <div className={`max-w-5xl mx-auto px-6 md:px-12 ${v.sectionPad}`}>
            <div className="text-center mb-10">
              <Eyebrow v={v}>{block.eyebrow}</Eyebrow>
              {place?.rating !== undefined && (
                <div className="flex items-center justify-center gap-2 text-lg">
                  <span className="font-semibold" style={{ color: "var(--s-accent)" }}>{place.rating.toFixed(1)}</span>
                  <span className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={15} fill={n <= Math.round(place.rating!) ? "var(--s-accent)" : "none"} stroke="var(--s-accent)" />
                    ))}
                  </span>
                  <span className="text-sm" style={{ color: "var(--s-text-dim)" }}>Google の口コミ {place.userRatingCount ?? 0} 件</span>
                </div>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {items.slice(0, 4).map((r, i) => (
                <motion.blockquote key={i} {...reveal} transition={{ duration: 0.5, delay: i * 0.08 }} className="p-6" style={{ background: "var(--s-bg)", border: "1px solid var(--s-line)", borderRadius: v.radius }}>
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={12} fill={n <= r.rating ? "var(--s-accent)" : "none"} stroke="var(--s-accent)" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed line-clamp-5" style={{ color: "var(--s-text-dim)" }}>{r.text}</p>
                  <footer className="text-xs mt-4" style={{ color: "var(--s-text-dim)", opacity: 0.7 }}>
                    {r.author}{r.time ? ` ・ ${r.time}` : ""}
                  </footer>
                </motion.blockquote>
              ))}
            </div>
            {place?.googleMapsUri && (
              <div className="text-center mt-8">
                <a href={place.googleMapsUri} target="_blank" rel="noreferrer" onClick={() => onTrack("map_click")} className="inline-flex items-center gap-1.5 text-xs tracking-wider" style={{ color: "var(--s-accent)" }}>
                  Google マップで見る <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </section>,
      );
    }

    case "info": {
      const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(block.mapQuery || block.address)}&hl=ja&z=16&output=embed`;
      return wrap(
        <section className={`${v.container} mx-auto px-6 md:px-12 ${v.sectionPad}`}>
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <motion.div {...reveal}>
              <T ctx={ctx} blockId={block.id} path={["eyebrow"]} value={block.eyebrow} as="div" className={`${v.eyebrow} mb-4`} style={{ color: "var(--s-accent)" }} />
              <T ctx={ctx} blockId={block.id} path={["heading"]} value={block.heading} as="h2" className={`${v.h2} mb-8`} style={{ fontFamily: "var(--s-font-heading)" }} />

              <dl className="space-y-4 text-[15px]">
                <Row icon={<MapPin size={15} />} label="住所">
                  <T ctx={ctx} blockId={block.id} path={["address"]} value={block.address} />
                </Row>
                {block.phone && (
                  <Row icon={<Phone size={15} />} label="電話">
                    {ctx.editable ? (
                      <T ctx={ctx} blockId={block.id} path={["phone"]} value={block.phone} />
                    ) : (
                      <a href={`tel:${block.phone}`} onClick={() => onTrack("tel_click")} style={{ color: "var(--s-accent)" }}>{block.phone}</a>
                    )}
                  </Row>
                )}
                {block.hours && (
                  <Row icon={<Clock size={15} />} label="営業時間">
                    <T ctx={ctx} blockId={block.id} path={["hours"]} value={block.hours} multiline />
                    {place?.openNow !== undefined && !ctx.editable && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: place.openNow ? "var(--s-accent)" : "transparent", color: place.openNow ? "var(--s-accent-text)" : "var(--s-text-dim)", border: place.openNow ? "none" : "1px solid var(--s-line)" }}>
                        {place.openNow ? "営業中" : "営業時間外"}
                      </span>
                    )}
                  </Row>
                )}
                {block.closedDays && (
                  <Row icon={<CalendarX2 size={15} />} label="定休日">
                    <T ctx={ctx} blockId={block.id} path={["closedDays"]} value={block.closedDays} />
                  </Row>
                )}
                {block.access && (
                  <Row icon={<Navigation size={15} />} label="アクセス">
                    <T ctx={ctx} blockId={block.id} path={["access"]} value={block.access} multiline />
                  </Row>
                )}
              </dl>

              <div className="flex flex-wrap gap-3 mt-8">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(block.mapQuery || block.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onTrack("map_click")}
                  className="inline-flex items-center gap-2 px-5 py-3 text-xs tracking-[0.18em]"
                  style={{ border: "1px solid var(--s-accent)", color: "var(--s-accent)", borderRadius: v.radius }}
                >
                  <Navigation size={13} /> 経路を検索
                </a>
                {place?.googleMapsUri && (
                  <a href={place.googleMapsUri} target="_blank" rel="noreferrer" onClick={() => onTrack("map_click")} className="inline-flex items-center gap-2 px-5 py-3 text-xs tracking-[0.18em]" style={{ border: "1px solid var(--s-line)", color: "var(--s-text-dim)", borderRadius: v.radius }}>
                    <ExternalLink size={13} /> Google マップ
                  </a>
                )}
              </div>
            </motion.div>

            <motion.div {...reveal} className="overflow-hidden w-full aspect-[4/3] md:aspect-square" style={{ borderRadius: v.radius, border: "1px solid var(--s-line)" }}>
              <iframe title="map" src={mapSrc} className="w-full h-full" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            </motion.div>
          </div>
        </section>,
      );
    }

    case "cta":
      return wrap(
        <section style={{ background: "var(--s-surface)", borderTop: "1px solid var(--s-line)" }}>
          <div className={`max-w-2xl mx-auto px-6 ${v.sectionPad} text-center`}>
            <T ctx={ctx} blockId={block.id} path={["heading"]} value={block.heading} as="h2" className={`${v.h2} mb-4`} style={{ fontFamily: "var(--s-font-heading)" }} />
            <T ctx={ctx} blockId={block.id} path={["body"]} value={block.body} as="p" className="mb-8 text-[15px]" style={{ color: "var(--s-text-dim)" }} />
            <div className="inline-block">
              <a
                href="#reserve"
                data-reserve
                onClick={(e) => {
                  if (ctx.editable) e.preventDefault();
                  onTrack("reserve_click");
                }}
                className="inline-flex items-center gap-2 px-8 py-4 text-xs tracking-[0.25em] font-medium transition-opacity hover:opacity-85"
                style={{ background: "var(--s-accent)", color: "var(--s-accent-text)", borderRadius: v.radius }}
              >
                <Phone size={14} />
                <T ctx={ctx} blockId={block.id} path={["buttonLabel"]} value={block.buttonLabel} />
              </a>
            </div>
          </div>
        </section>,
      );

    case "text":
      return wrap(
        <section className={`max-w-3xl mx-auto px-6 md:px-12 ${v.sectionPad}`}>
          <T ctx={ctx} blockId={block.id} path={["eyebrow"]} value={block.eyebrow} as="div" className={`${v.eyebrow} mb-4`} style={{ color: "var(--s-accent)" }} />
          <T ctx={ctx} blockId={block.id} path={["heading"]} value={block.heading} as="h2" className={`${v.h2} mb-5`} style={{ fontFamily: "var(--s-font-heading)" }} />
          <T ctx={ctx} blockId={block.id} path={["body"]} value={block.body} as="p" multiline className="leading-loose text-[15px]" style={{ color: "var(--s-text-dim)" }} />
        </section>,
      );

    default:
      return null;
  }
}

/** 予約・お問い合わせフォーム。全店舗のサイトに必ず入る（ブロック構成に依存しない） */
function ReserveSection({
  v,
  slug,
  phone,
  editable,
  onTrack,
}: {
  v: V;
  slug: string;
  phone: string | null;
  editable: boolean;
  onTrack: (type: string) => void;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editable) return;
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      preferredDate: String(fd.get("preferredDate") ?? ""),
      preferredTime: String(fd.get("preferredTime") ?? ""),
      message: String(fd.get("message") ?? ""),
      visitorId: localStorage.getItem("is_visitor_id") ?? "",
    };
    const size = String(fd.get("partySize") ?? "");
    if (size) body.partySize = Number(size);

    if (!body.phone && !body.email) {
      setError("電話番号かメールアドレスのどちらかを入力してください");
      return;
    }

    setError("");
    setState("sending");
    try {
      const res = await fetch(`/api/reservations/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error ?? "送信に失敗しました");
      // 転換（form_submit）はサーバー側で記録されるので、ここでは二重計上しない
      setState("done");
    } catch (err: any) {
      setError(err?.message ?? "送信に失敗しました");
      setState("idle");
    }
  };

  const fieldStyle: React.CSSProperties = {
    background: "var(--s-bg)",
    border: "1px solid var(--s-line)",
    color: "var(--s-text)",
    borderRadius: v.radius,
  };
  const labelCls = "block text-[11px] tracking-[0.15em] mb-1.5";
  const inputCls = "w-full px-3.5 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[color:var(--s-accent)]/40";

  return (
    <section id="reserve" className="scroll-mt-20" style={{ background: "var(--s-surface)", borderTop: "1px solid var(--s-line)" }}>
      <div className={`max-w-2xl mx-auto px-6 ${v.sectionPad}`}>
        <div className="text-center mb-9">
          <div className={`${v.eyebrow} mb-3`} style={{ color: "var(--s-accent)" }}>RESERVATION / CONTACT</div>
          <h2 className={`${v.h2} mb-3`} style={{ fontFamily: "var(--s-font-heading)" }}>ご予約・お問い合わせ</h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--s-text-dim)" }}>
            下のフォームからお気軽にどうぞ。折り返しご連絡いたします。
            {phone && <><br className="hidden sm:block" />お急ぎの場合はお電話（<a href={`tel:${phone}`} onClick={() => onTrack("tel_click")} style={{ color: "var(--s-accent)" }}>{phone}</a>）でも承ります。</>}
          </p>
        </div>

        {state === "done" ? (
          <div className="text-center py-12 px-6" style={{ border: "1px solid var(--s-accent)", borderRadius: v.radius }}>
            <div className="text-3xl mb-4" style={{ color: "var(--s-accent)" }}>✓</div>
            <p className="text-lg mb-2" style={{ fontFamily: "var(--s-font-heading)" }}>送信しました</p>
            <p className="text-sm" style={{ color: "var(--s-text-dim)" }}>
              内容を確認のうえ、担当者より折り返しご連絡いたします。ありがとうございました。
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className={labelCls} style={{ color: "var(--s-text-dim)" }} htmlFor="rv-name">お名前 <span style={{ color: "var(--s-accent)" }}>*</span></label>
              <input id="rv-name" name="name" required maxLength={80} placeholder="山田 太郎" className={inputCls} style={fieldStyle} />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelCls} style={{ color: "var(--s-text-dim)" }} htmlFor="rv-phone">電話番号</label>
                <input id="rv-phone" name="phone" type="tel" inputMode="tel" maxLength={40} placeholder="090-1234-5678" className={inputCls} style={fieldStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: "var(--s-text-dim)" }} htmlFor="rv-email">メールアドレス</label>
                <input id="rv-email" name="email" type="email" maxLength={120} placeholder="you@example.com" className={inputCls} style={fieldStyle} />
              </div>
            </div>
            <p className="text-[11px] -mt-2" style={{ color: "var(--s-text-dim)", opacity: 0.8 }}>
              ※ 電話番号・メールアドレスのどちらか一方は必ずご入力ください。
            </p>

            <div className="grid sm:grid-cols-3 gap-5">
              <div>
                <label className={labelCls} style={{ color: "var(--s-text-dim)" }} htmlFor="rv-date">ご希望日</label>
                <input id="rv-date" name="preferredDate" type="date" min={today} className={inputCls} style={fieldStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: "var(--s-text-dim)" }} htmlFor="rv-time">ご希望時間</label>
                <input id="rv-time" name="preferredTime" type="time" step={900} className={inputCls} style={fieldStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: "var(--s-text-dim)" }} htmlFor="rv-size">人数</label>
                <input id="rv-size" name="partySize" type="number" min={1} max={200} placeholder="2" className={inputCls} style={fieldStyle} />
              </div>
            </div>

            <div>
              <label className={labelCls} style={{ color: "var(--s-text-dim)" }} htmlFor="rv-msg">ご要望・お問い合わせ</label>
              <textarea id="rv-msg" name="message" rows={4} maxLength={2000} placeholder="席のご希望、アレルギー、記念日のご利用など、ご自由にお書きください。" className={`${inputCls} resize-y`} style={fieldStyle} />
            </div>

            {error && <p className="text-sm" style={{ color: "#d14343" }}>{error}</p>}

            <button
              type="submit"
              disabled={state === "sending" || editable}
              className="w-full py-4 text-xs tracking-[0.25em] font-medium transition-opacity hover:opacity-85 disabled:opacity-60"
              style={{ background: "var(--s-accent)", color: "var(--s-accent-text)", borderRadius: v.radius }}
            >
              {editable ? "（編集中はプレビューのみ）" : state === "sending" ? "送信中…" : "この内容で送信する"}
            </button>
            <p className="text-[11px] text-center" style={{ color: "var(--s-text-dim)", opacity: 0.75 }}>
              送信いただいた内容は、ご連絡以外の目的では使用いたしません。
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 shrink-0" style={{ color: "var(--s-accent)" }}>{icon}</span>
      <div>
        <dt className="text-[11px] tracking-[0.15em] mb-0.5" style={{ color: "var(--s-text-dim)", opacity: 0.75 }}>{label}</dt>
        <dd style={{ color: "var(--s-text)" }}>{children}</dd>
      </div>
    </div>
  );
}

export function SiteRenderer({
  theme,
  blocks,
  businessName,
  phone,
  instagramUrl,
  facebookUrl,
  tiktokUrl,
  place,
  pages,
  activeKind,
  slug,
  onNavigate,
  onTrack = () => {},
  ctx = noopCtx,
}: {
  theme: SiteTheme;
  blocks: PageBlock[];
  businessName: string;
  phone: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  place: PlaceData | null;
  pages: { kind: string; title: string }[];
  activeKind: string;
  slug: string;
  onNavigate?: (kind: string) => void;
  onTrack?: (type: string) => void;
  ctx?: EditCtx;
}) {
  const v = variantStyles(theme);
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const headerBg = scrolled
    ? { background: "var(--s-bg)", borderBottom: "1px solid var(--s-line)" }
    : { background: "linear-gradient(to bottom, rgba(0,0,0,.55), transparent)" };
  const headerText = scrolled ? "var(--s-text)" : "#fff";
  const headerDim = scrolled ? "var(--s-text-dim)" : "rgba(255,255,255,.78)";

  return (
    <div
      style={{ ...themeToCssVars(theme), background: "var(--s-bg)", color: "var(--s-text)", fontFamily: "var(--s-font-body)" } as React.CSSProperties}
      className="min-h-screen"
    >
      {/* ヘッダー */}
      <div ref={sentinel} className="h-px w-full" />
      <header className="sticky top-0 z-30 h-16 -mb-16 flex items-center justify-between gap-4 px-5 md:px-10 backdrop-blur-sm transition-colors duration-300" style={headerBg}>
        <button onClick={() => onNavigate?.("home")} className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ border: "1px solid var(--s-accent)", color: "var(--s-accent)" }}>
            {businessName.slice(0, 1)}
          </span>
          <span className="text-xs tracking-[0.18em] truncate transition-colors" style={{ color: headerText }}>{businessName}</span>
        </button>
        <nav className="flex items-center gap-4 text-[11px] tracking-[0.15em]">
          {pages.map((p) => (
            <button
              key={p.kind}
              onClick={() => onNavigate?.(p.kind)}
              className="transition-opacity hover:opacity-100"
              style={{ color: p.kind === activeKind ? "var(--s-accent)" : headerDim }}
            >
              {p.title}
            </button>
          ))}
          {phone && (
            <a href={`tel:${phone}`} onClick={() => onTrack("tel_click")} className="hidden md:inline-flex items-center gap-1.5" style={{ color: "var(--s-accent)" }}>
              <Phone size={12} /> {phone}
            </a>
          )}
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onTrack("instagram_click")}
              aria-label="Instagram"
              className="inline-flex items-center"
              style={{ color: headerDim }}
            >
              <Instagram size={16} />
            </a>
          )}
          {facebookUrl && (
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onTrack("facebook_click")}
              aria-label="Facebook"
              className="inline-flex items-center"
              style={{ color: headerDim }}
            >
              <Facebook size={16} />
            </a>
          )}
          {tiktokUrl && (
            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onTrack("tiktok_click")}
              aria-label="TikTok"
              className="inline-flex items-center"
              style={{ color: headerDim }}
            >
              <TikTokIcon size={16} />
            </a>
          )}
          <a
            href="#reserve"
            onClick={(e) => {
              if (ctx.editable) e.preventDefault();
              onTrack("reserve_click");
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2"
            style={{ background: "var(--s-accent)", color: "var(--s-accent-text)", borderRadius: v.radius }}
          >
            <CalendarCheck size={12} /> ご予約
          </a>
        </nav>
      </header>

      {blocks.map((b, i) => (
        <Block key={b.id} block={b} v={v} ctx={ctx} place={place} onTrack={onTrack} isFirst={i === 0} />
      ))}

      <ReserveSection v={v} slug={slug} phone={phone} editable={!!ctx.editable} onTrack={onTrack} />

      <footer className="py-8 text-center text-[11px] tracking-[0.2em]" style={{ borderTop: "1px solid var(--s-line)", color: "var(--s-text-dim)", opacity: 0.7 }}>
        © {new Date().getFullYear()} {businessName}
      </footer>

      {/* スマホ用の固定バー：電話 と Web予約フォーム */}
      {!ctx.editable && (
        <div className="sm:hidden sticky bottom-0 z-40 flex" style={{ borderTop: "1px solid var(--s-line)" }}>
          {phone && (
            <a
              href={`tel:${phone}`}
              onClick={() => onTrack("tel_click")}
              className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium"
              style={{ background: "var(--s-bg)", color: "var(--s-accent)" }}
            >
              <Phone size={16} /> 電話する
            </a>
          )}
          <a
            href="#reserve"
            onClick={() => onTrack("reserve_click")}
            className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium"
            style={{ background: "var(--s-accent)", color: "var(--s-accent-text)" }}
          >
            <CalendarCheck size={16} /> 予約・問い合わせ
          </a>
        </div>
      )}
    </div>
  );
}
