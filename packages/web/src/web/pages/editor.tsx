import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Undo2, ExternalLink, Monitor, Smartphone, Loader2, Check, X, RefreshCw,
  MapPin, Palette, MessageSquare, ArrowLeft, BarChart3, Copy, Star,
} from "lucide-react";
import { SiteRenderer } from "../site/renderer";
import { DEFAULT_THEME, ALLOWED_FONTS, type PageBlock, type SiteTheme } from "../../shared/site-model";
import type { EditCtx } from "../site/parts";

type Page = { id: number; kind: string; title: string; blocks: PageBlock[] };

const setByPath = (obj: any, path: (string | number)[], value: any): any => {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const copy = [...obj];
    copy[head as number] = setByPath(copy[head as number], rest, value);
    return copy;
  }
  return { ...obj, [head]: setByPath(obj?.[head], rest, value) };
};

export default function Editor() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["site", slug],
    queryFn: async () => (await fetch(`/api/sites/${slug}`)).json() as Promise<{ site: any; pages: Page[] }>,
  });

  const [pages, setPages] = useState<Page[]>([]);
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [activeKind, setActive] = useState("home");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [tab, setTab] = useState<"ai" | "theme" | "place">("ai");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // AI編集
  const [instruction, setInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [proposal, setProposal] = useState<{ summary: string; blocks: PageBlock[]; theme: SiteTheme | null; changedIds: string[] } | null>(null);
  const [aiError, setAiError] = useState("");
  const [placeBusy, setPlaceBusy] = useState(false);

  const saveTimer = useRef<any>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pickTarget = useRef<{ blockId: string; path: (string | number)[] } | null>(null);

  useEffect(() => {
    if (data) {
      setPages(data.pages);
      setTheme(data.site.theme ?? DEFAULT_THEME);
      setInstagramUrl(data.site.instagramUrl ?? "");
      setFacebookUrl(data.site.facebookUrl ?? "");
      setTiktokUrl(data.site.tiktokUrl ?? "");
    }
  }, [data]);

  const page = pages.find((p) => p.kind === activeKind) ?? pages[0];
  const shownBlocks = proposal && proposal.blocks.length ? proposal.blocks : page?.blocks ?? [];
  const shownTheme = proposal?.theme ?? theme;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const persist = async (kind: string, blocks: PageBlock[]) => {
    setSaving(true);
    await fetch(`/api/sites/${slug}/pages/${kind}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["sites"] });
  };

  const onEdit = (blockId: string, path: (string | number)[], value: string) => {
    if (!page) return;
    const next = page.blocks.map((b) => (b.id === blockId ? (setByPath(b, path, value) as PageBlock) : b));
    setPages((ps) => ps.map((p) => (p.kind === page.kind ? { ...p, blocks: next } : p)));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(page.kind, next), 700);
  };

  const onPickImage = (blockId: string, path: (string | number)[]) => {
    pickTarget.current = { blockId, path };
    fileInput.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !pickTarget.current || !page) return;
    const target = pickTarget.current;
    flash("画像を変換中…");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/media/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!json.key) return flash("アップロードに失敗しました");
    const next = page.blocks.map((b) => (b.id === target.blockId ? (setByPath(b, target.path, json.key) as PageBlock) : b));
    setPages((ps) => ps.map((p) => (p.kind === page.kind ? { ...p, blocks: next } : p)));
    await persist(page.kind, next);
    flash("画像を差し替えました");
  };

  const runAi = async () => {
    if (!instruction.trim() || !page) return;
    setAiBusy(true);
    setAiError("");
    try {
      const res = await fetch(`/api/sites/${slug}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, pageKind: page.kind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗しました");
      setProposal(json);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "失敗しました");
    } finally {
      setAiBusy(false);
    }
  };

  const applyProposal = async () => {
    if (!proposal || !page) return;
    await fetch(`/api/sites/${slug}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageKind: page.kind, blocks: proposal.blocks, theme: proposal.theme }),
    });
    setPages((ps) => ps.map((p) => (p.kind === page.kind ? { ...p, blocks: proposal.blocks } : p)));
    if (proposal.theme) setTheme(proposal.theme);
    setProposal(null);
    setInstruction("");
    flash("変更を反映しました");
    qc.invalidateQueries({ queryKey: ["sites"] });
  };

  const undo = async () => {
    const res = await fetch(`/api/sites/${slug}/undo`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) return flash(json.error ?? "戻せませんでした");
    await refetch();
    flash("1つ前に戻しました");
  };

  const saveTheme = async (next: SiteTheme) => {
    setTheme(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await fetch(`/api/sites/${slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: next }) });
      setSaving(false);
    }, 500);
  };

  const saveInstagramUrl = (next: string) => {
    setInstagramUrl(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await fetch(`/api/sites/${slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instagramUrl: next.trim() || null }) });
      setSaving(false);
    }, 600);
  };

  const saveFacebookUrl = (next: string) => {
    setFacebookUrl(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await fetch(`/api/sites/${slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facebookUrl: next.trim() || null }) });
      setSaving(false);
    }, 600);
  };

  const saveTiktokUrl = (next: string) => {
    setTiktokUrl(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await fetch(`/api/sites/${slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tiktokUrl: next.trim() || null }) });
      setSaving(false);
    }, 600);
  };

  const refreshPlace = async () => {
    setPlaceBusy(true);
    const res = await fetch(`/api/sites/${slug}/refresh-place`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const json = await res.json();
    setPlaceBusy(false);
    if (!res.ok) return flash(json.error ?? "取得に失敗しました");
    await refetch();
    flash("Googleの情報を更新しました");
  };

  const ctx: EditCtx = useMemo(
    () => ({ editable: !proposal, onEdit, onPickImage, highlight: proposal?.changedIds }),
    [proposal, page],
  );

  if (isLoading || !data) return <div className="min-h-screen grid place-items-center text-sm text-neutral-500">読み込み中…</div>;

  const site = data.site;
  const publicUrl = `${location.origin}/s/${slug}`;

  return (
    <div className="h-screen flex flex-col bg-[#eceae5]" style={{ fontFamily: '"Zen Kaku Gothic New", sans-serif' }}>
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      {/* ツールバー */}
      <header className="h-14 shrink-0 bg-white border-b border-black/10 flex items-center gap-3 px-4">
        <Link href="/" className="p-2 -ml-2 rounded-lg hover:bg-black/5 text-[#171512]/70">
          <ArrowLeft size={17} />
        </Link>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{site.businessName}</div>
          <div className="text-[11px] text-[#171512]/45">編集・更新はクレジットを消費しません</div>
        </div>

        <div className="ml-4 flex items-center gap-0.5 bg-[#f6f5f2] rounded-lg p-0.5">
          {pages.map((p) => (
            <button
              key={p.kind}
              onClick={() => { setActive(p.kind); setProposal(null); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${p.kind === activeKind ? "bg-white shadow-sm" : "text-[#171512]/55 hover:text-[#171512]"}`}
            >
              {p.title}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {saving && <span className="text-[11px] text-[#171512]/45 flex items-center gap-1"><Loader2 size={11} className="animate-spin" />保存中</span>}
          <div className="flex items-center gap-0.5 bg-[#f6f5f2] rounded-lg p-0.5 mr-1">
            <button onClick={() => setDevice("desktop")} className={`p-1.5 rounded-md ${device === "desktop" ? "bg-white shadow-sm" : "text-[#171512]/45"}`}><Monitor size={14} /></button>
            <button onClick={() => setDevice("mobile")} className={`p-1.5 rounded-md ${device === "mobile" ? "bg-white shadow-sm" : "text-[#171512]/45"}`}><Smartphone size={14} /></button>
          </div>
          <button onClick={undo} className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg hover:bg-black/5 text-[#171512]/70"><Undo2 size={14} /> 元に戻す</button>
          <Link href={`/analytics/${slug}`} className="p-2 rounded-lg hover:bg-black/5 text-[#171512]/70"><BarChart3 size={15} /></Link>
          <button onClick={() => { navigator.clipboard?.writeText(publicUrl); flash("URLをコピーしました"); }} className="p-2 rounded-lg hover:bg-black/5 text-[#171512]/70"><Copy size={15} /></button>
          <a href={`/s/${slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg bg-[#171512] text-white font-medium"><ExternalLink size={13} /> 公開サイト</a>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* プレビュー */}
        <div className="flex-1 overflow-auto p-5">
          <div
            className="mx-auto bg-black shadow-2xl transition-all duration-300 overflow-hidden"
            style={{ width: device === "mobile" ? 390 : "100%", maxWidth: device === "mobile" ? 390 : 1400, borderRadius: 14 }}
          >
            <SiteRenderer
              theme={shownTheme}
              blocks={shownBlocks}
              businessName={site.businessName}
              phone={site.phone}
              instagramUrl={instagramUrl}
              facebookUrl={facebookUrl}
              tiktokUrl={tiktokUrl}
              place={site.placeData ?? null}
              pages={pages.map((p) => ({ kind: p.kind, title: p.title }))}
              activeKind={activeKind}
              slug={slug}
              onNavigate={(k) => { setActive(k); setProposal(null); }}
              ctx={ctx}
            />
          </div>
          {!proposal && (
            <p className="text-center text-xs text-[#171512]/40 mt-4">
              文字をクリックすると直接書き換えられます。写真はクリックで差し替え。変更は自動保存されます。
            </p>
          )}
        </div>

        {/* 右パネル */}
        <aside className="w-[340px] shrink-0 bg-white border-l border-black/10 flex flex-col">
          <div className="flex border-b border-black/8">
            {([["ai", "AI編集", MessageSquare], ["theme", "配色", Palette], ["place", "Google", MapPin]] as const).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex-1 py-3 text-xs font-medium inline-flex items-center justify-center gap-1.5 border-b-2 transition-colors ${tab === k ? "border-[#1f6d4f] text-[#1f6d4f]" : "border-transparent text-[#171512]/50 hover:text-[#171512]"}`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {tab === "ai" && (
              <div className="space-y-3">
                <p className="text-xs text-[#171512]/55 leading-relaxed">
                  日本語で指示すると、AIがこのページの該当箇所だけを書き換えます。適用前にプレビューで確認できます。
                </p>
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  rows={3}
                  placeholder="例：見出しをもっと明るい雰囲気に&#10;例：紹介文を短く、家族連れ向けに&#10;例：全体を和風の落ち着いた配色に"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#f6f5f2] border border-black/10 text-sm outline-none focus:border-[#1f6d4f] resize-none"
                />
                <div className="flex flex-wrap gap-1.5">
                  {["もっと親しみやすい文章に", "高級感のある配色に", "キャッチコピーを3案から良いものに", "文章を短く読みやすく"].map((s) => (
                    <button key={s} onClick={() => setInstruction(s)} className="text-[11px] px-2 py-1 rounded-md bg-[#f6f5f2] hover:bg-black/8 text-[#171512]/65">{s}</button>
                  ))}
                </div>
                <button onClick={runAi} disabled={aiBusy || !instruction.trim()} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1f6d4f] text-white text-sm font-medium disabled:opacity-40">
                  {aiBusy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} AIで修正する
                </button>
                {aiError && <p className="text-xs text-red-600">{aiError}</p>}

                {proposal && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 space-y-3">
                    <p className="text-xs text-blue-900 leading-relaxed">{proposal.summary}</p>
                    <p className="text-[11px] text-blue-700/80">{proposal.changedIds.length} 箇所を変更（プレビューで青枠）{proposal.theme ? "・配色も変更" : ""}</p>
                    <div className="flex gap-2">
                      <button onClick={applyProposal} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"><Check size={13} /> 適用する</button>
                      <button onClick={() => setProposal(null)} className="px-3 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs"><X size={13} /></button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "theme" && (
              <div className="space-y-4">
                {theme.rationale && <p className="text-xs text-[#171512]/50 leading-relaxed bg-[#f6f5f2] rounded-lg p-3">{theme.rationale}</p>}
                <div>
                  <div className="text-xs font-medium mb-2">レイアウト</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["elegant", "natural", "bold"] as const).map((l) => (
                      <button key={l} onClick={() => saveTheme({ ...theme, layout: l })} className={`py-2 rounded-lg text-[11px] border ${theme.layout === l ? "bg-[#171512] text-white border-[#171512]" : "border-black/12 hover:border-black/30"}`}>
                        {{ elegant: "高級", natural: "ナチュラル", bold: "力強い" }[l]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {([["bg", "背景"], ["surface", "帯の背景"], ["text", "文字"], ["textDim", "補足文字"], ["accent", "アクセント"], ["accentText", "アクセント上の文字"]] as const).map(([k, label]) => (
                    <div key={k} className="flex items-center gap-2.5">
                      <input type="color" value={/^#/.test((theme as any)[k]) ? (theme as any)[k] : "#888888"} onChange={(e) => saveTheme({ ...theme, [k]: e.target.value })} className="w-8 h-8 rounded-md border border-black/10 cursor-pointer bg-transparent" />
                      <span className="text-xs flex-1">{label}</span>
                      <input value={(theme as any)[k]} onChange={(e) => saveTheme({ ...theme, [k]: e.target.value })} className="w-24 text-[11px] px-2 py-1 rounded-md bg-[#f6f5f2] border border-black/10 outline-none font-mono" />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {([["fontHeading", "見出しフォント"], ["fontBody", "本文フォント"]] as const).map(([k, label]) => (
                    <div key={k}>
                      <div className="text-xs font-medium mb-1">{label}</div>
                      <select value={(theme as any)[k]} onChange={(e) => saveTheme({ ...theme, [k]: e.target.value })} className="w-full px-2.5 py-2 rounded-lg bg-[#f6f5f2] border border-black/10 text-sm outline-none">
                        {ALLOWED_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-xs font-medium mb-2">角丸</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["none", "sm", "md", "lg"] as const).map((r) => (
                      <button key={r} onClick={() => saveTheme({ ...theme, radius: r })} className={`py-2 rounded-lg text-[11px] border ${theme.radius === r ? "bg-[#171512] text-white border-[#171512]" : "border-black/12"}`}>{r}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "place" && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium mb-2">Instagram</div>
                  <input
                    value={instagramUrl}
                    onChange={(e) => saveInstagramUrl(e.target.value)}
                    placeholder="https://www.instagram.com/店舗アカウント/"
                    className="w-full px-2.5 py-2 rounded-lg bg-[#f6f5f2] border border-black/10 text-sm outline-none focus:border-[#1f6d4f]"
                  />
                  <p className="text-[11px] text-[#171512]/45 mt-1.5">入力するとヘッダーの「ご予約」ボタンの左にアイコンが表示されます。空欄なら非表示です。</p>
                </div>

                <div>
                  <div className="text-xs font-medium mb-2">Facebook</div>
                  <input
                    value={facebookUrl}
                    onChange={(e) => saveFacebookUrl(e.target.value)}
                    placeholder="https://www.facebook.com/店舗ページ/"
                    className="w-full px-2.5 py-2 rounded-lg bg-[#f6f5f2] border border-black/10 text-sm outline-none focus:border-[#1f6d4f]"
                  />
                  <p className="text-[11px] text-[#171512]/45 mt-1.5">入力するとヘッダーにアイコンが表示されます。空欄なら非表示です。</p>
                </div>

                <div>
                  <div className="text-xs font-medium mb-2">TikTok</div>
                  <input
                    value={tiktokUrl}
                    onChange={(e) => saveTiktokUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@店舗アカウント"
                    className="w-full px-2.5 py-2 rounded-lg bg-[#f6f5f2] border border-black/10 text-sm outline-none focus:border-[#1f6d4f]"
                  />
                  <p className="text-[11px] text-[#171512]/45 mt-1.5">入力するとヘッダーにアイコンが表示されます。空欄なら非表示です。</p>
                </div>

                <p className="text-xs text-[#171512]/55 leading-relaxed">Googleマップの店舗情報（評価・口コミ・営業状況）を取り込みます。</p>
                <button onClick={refreshPlace} disabled={placeBusy} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#171512] text-white text-sm font-medium disabled:opacity-40">
                  {placeBusy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Googleの情報を再取得
                </button>

                {site.placeData ? (
                  <div className="rounded-xl border border-black/10 p-3.5 space-y-2 text-xs">
                    <div className="font-medium text-sm">{site.placeData.name}</div>
                    <div className="flex items-center gap-1.5">
                      <Star size={12} className="text-amber-500" fill="currentColor" />
                      <span className="font-semibold">{site.placeData.rating ?? "–"}</span>
                      <span className="text-[#171512]/50">口コミ {site.placeData.userRatingCount ?? 0} 件</span>
                    </div>
                    <div className="text-[#171512]/60">{site.placeData.formattedAddress}</div>
                    {site.placeData.weekdayDescriptions?.length > 0 && (
                      <div className="text-[#171512]/55 leading-relaxed">{site.placeData.weekdayDescriptions.join(" / ")}</div>
                    )}
                    <div className="text-[#171512]/40 text-[10px]">取得: {site.placeData.fetchedAt?.slice(0, 16).replace("T", " ")}</div>
                  </div>
                ) : (
                  <p className="text-xs text-[#171512]/45">まだ取得できていません。APIキーが未設定か、店舗が見つからなかった可能性があります。</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#171512] text-white text-sm shadow-xl">{toast}</div>
      )}
    </div>
  );
}
