import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X, Upload, Sparkles, Loader2, ImageIcon, ClipboardPaste } from "lucide-react";
import { AdminShell, Field, inputCls, useCredits } from "../components/admin";
import { BUSINESS_CATEGORIES, MOODS } from "../../shared/site-model";
import { imageSrc } from "../../shared/media";

type Row = { name: string; price: string; description: string };

type Draft = {
  businessName: string;
  businessCategory: string;
  address: string;
  phone: string;
  hours: string;
  closedDays: string;
  targetAudience: string;
  strengths: string;
  mood: string;
  rows: Row[];
  imageKeys: string[];
  bulkText: string;
};

const DRAFT_KEY = "instantsite:new-site-draft";

const emptyDraft: Draft = {
  businessName: "",
  businessCategory: "restaurant",
  address: "",
  phone: "",
  hours: "",
  closedDays: "",
  targetAudience: "",
  strengths: "",
  mood: "おまかせ",
  rows: [{ name: "", price: "", description: "" }],
  imageKeys: [],
  bulkText: "",
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft;
    return { ...emptyDraft, ...JSON.parse(raw) };
  } catch {
    return emptyDraft;
  }
}

export default function NewSite() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: credits } = useCredits();

  const [draft] = useState(loadDraft);
  const [businessName, setBusinessName] = useState(draft.businessName);
  const [businessCategory, setCategory] = useState(draft.businessCategory);
  const [address, setAddress] = useState(draft.address);
  const [phone, setPhone] = useState(draft.phone);
  const [hours, setHours] = useState(draft.hours);
  const [closedDays, setClosedDays] = useState(draft.closedDays);
  const [targetAudience, setTarget] = useState(draft.targetAudience);
  const [strengths, setStrengths] = useState(draft.strengths);
  const [mood, setMood] = useState<string>(draft.mood);
  const [rows, setRows] = useState<Row[]>(draft.rows);
  const [imageKeys, setImageKeys] = useState<string[]>(draft.imageKeys);
  const [bulkText, setBulkText] = useState(draft.bulkText);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 入力中にRunableのプレビューが再読み込みされても消えないよう、下書きを自動保存する
  useEffect(() => {
    const d: Draft = { businessName, businessCategory, address, phone, hours, closedDays, targetAudience, strengths, mood, rows, imageKeys, bulkText };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  }, [businessName, businessCategory, address, phone, hours, closedDays, targetAudience, strengths, mood, rows, imageKeys, bulkText]);

  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, ix) => (ix === i ? { ...x, ...patch } : x)));

  /** 「名称 価格 説明」を1行1品でゆるく解析する。価格・説明は省略可 */
  const parseBulkLine = (line: string): Row | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const priceMatch = trimmed.match(/¥\s?[\d,]+|[\d,]+\s?円/);
    if (!priceMatch) return { name: trimmed, price: "", description: "" };
    const name = trimmed.slice(0, priceMatch.index).trim();
    const description = trimmed.slice((priceMatch.index ?? 0) + priceMatch[0].length).trim();
    return { name: name || trimmed, price: priceMatch[0].trim(), description };
  };

  const applyBulk = () => {
    const parsed = bulkText.split("\n").map(parseBulkLine).filter((r): r is Row => r !== null);
    if (!parsed.length) return;
    setRows((r) => {
      const withoutBlank = r.filter((x) => x.name.trim() || x.price.trim() || x.description.trim());
      return [...withoutBlank, ...parsed];
    });
    setBulkText("");
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 3 - imageKeys.length)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/media/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json.key) setImageKeys((k) => [...k, json.key]);
      }
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError("");
    if (!businessName.trim() || !address.trim()) return setError("店名と住所は必須です。");
    setSubmitting(true);
    try {
      const res = await fetch("/api/sites/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          businessCategory,
          address,
          phone,
          hours,
          closedDays,
          targetAudience,
          strengths,
          mood,
          offerings: rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name, price: r.price || undefined, description: r.description || undefined })),
          imageKeys,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "生成に失敗しました");
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.invalidateQueries({ queryKey: ["sites"] });
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/generating/${json.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
      setSubmitting(false);
    }
  };

  return (
    <AdminShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight">新しい店舗サイトを作る</h1>
        <p className="text-sm text-[#171512]/55 mt-1 mb-8">
          入力するほど精度が上がります。空欄はAIが業種と立地から自然に補完します。生成で1クレジット消費（残り {credits?.balance ?? "–"}）。
        </p>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-[#171512]/10 p-6 space-y-5">
            <h2 className="text-sm font-semibold tracking-wide text-[#171512]/70">基本情報</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="店舗名" required>
                <input className={inputCls} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="炭火焼鳥 とりまる" />
              </Field>
              <Field label="業種">
                <select className={inputCls} value={businessCategory} onChange={(e) => setCategory(e.target.value)}>
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="住所" required hint="Googleマップの検索と地図表示に使います">
              <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="東京都杉並区高円寺南3-1-1" />
            </Field>
            <div className="grid sm:grid-cols-3 gap-5">
              <Field label="電話番号" hint="任意">
                <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03-1234-5678" />
              </Field>
              <Field label="営業時間" hint="任意">
                <input className={inputCls} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="17:00〜24:00" />
              </Field>
              <Field label="定休日" hint="任意">
                <input className={inputCls} value={closedDays} onChange={(e) => setClosedDays(e.target.value)} placeholder="日曜・祝日" />
              </Field>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-[#171512]/10 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-[#171512]/70">メニュー・商品</h2>
              <button onClick={() => setRows((r) => [...r, { name: "", price: "", description: "" }])} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#f6f5f2] hover:bg-black/5">
                <Plus size={13} /> 行を追加
              </button>
            </div>

            <div className="rounded-xl border border-dashed border-[#171512]/15 bg-[#f6f5f2]/60 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#171512]/70">
                <ClipboardPaste size={13} /> まとめて入力
              </div>
              <p className="text-[11px] text-[#171512]/45 leading-relaxed">
                1行に1品ずつ、名称と（あれば）価格・説明を書いて貼り付けてください。価格・説明は省略できます。
              </p>
              <textarea
                className={`${inputCls} bg-white min-h-28 resize-y font-mono text-[13px]`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"もも串 250円 紀州備長炭でじっくり焼き上げた自慢の一品\nつくね 280円\nレバー"}
              />
              <button
                onClick={applyBulk}
                disabled={!bulkText.trim()}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#171512] text-white disabled:opacity-30"
              >
                <Sparkles size={13} /> 下の一覧に反映
              </button>
            </div>

            <div className="space-y-3">
              {rows.map((r, i) => (
                <div key={i} className="rounded-xl border border-[#171512]/10 bg-[#f6f5f2] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#171512]/45">商品 {i + 1}</span>
                    <button onClick={() => setRows((rs) => rs.filter((_, ix) => ix !== i))} className="p-1.5 rounded-lg text-[#171512]/40 hover:bg-red-50 hover:text-red-500 shrink-0">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-[1fr_140px] gap-3">
                    <Field label="名称">
                      <input className={`${inputCls} bg-white`} value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="例：もも串" />
                    </Field>
                    <Field label="価格">
                      <input className={`${inputCls} bg-white`} value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} placeholder="¥250" />
                    </Field>
                  </div>
                  <Field label="説明" hint="空欄可">
                    <textarea
                      className={`${inputCls} bg-white min-h-20 resize-y`}
                      value={r.description}
                      onChange={(e) => setRow(i, { description: e.target.value })}
                      placeholder="例：紀州備長炭でじっくり焼き上げた自慢の一品"
                    />
                  </Field>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#171512]/45">空欄のままでも、業種から定番メニューをAIが作成します。</p>
          </section>

          <section className="bg-white rounded-2xl border border-[#171512]/10 p-6 space-y-5">
            <h2 className="text-sm font-semibold tracking-wide text-[#171512]/70">雰囲気とターゲット</h2>
            <Field label="参考にしたい雰囲気" hint="配色とフォントの方向性が変わります">
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`px-3.5 py-2 rounded-lg text-sm border transition-colors ${mood === m ? "bg-[#171512] text-white border-[#171512]" : "bg-white border-[#171512]/15 hover:border-[#171512]/35"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="ターゲット顧客層" hint="任意">
                <input className={inputCls} value={targetAudience} onChange={(e) => setTarget(e.target.value)} placeholder="仕事帰りの30〜40代、近隣の常連" />
              </Field>
              <Field label="強み・こだわり" hint="任意">
                <input className={inputCls} value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="紀州備長炭、朝引きの地鶏、日本酒30種" />
              </Field>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-[#171512]/10 p-6 space-y-4">
            <h2 className="text-sm font-semibold tracking-wide text-[#171512]/70">写真（任意・最大3枚）</h2>
            <p className="text-xs text-[#171512]/45">アップロードしない場合はAIが店の雰囲気に合わせた写真を生成します。アップロード時は自動でWebP・3サイズに軽量化されます。</p>
            <div className="flex flex-wrap gap-3">
              {imageKeys.map((k, i) => (
                <div key={k} className="relative w-28 h-28 rounded-xl overflow-hidden border border-[#171512]/10">
                  <img src={imageSrc(k, 640)} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setImageKeys((ks) => ks.filter((_, ix) => ix !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white grid place-items-center">
                    <X size={13} />
                  </button>
                </div>
              ))}
              {imageKeys.length < 3 && (
                <label className="w-28 h-28 rounded-xl border-2 border-dashed border-[#171512]/15 grid place-items-center cursor-pointer hover:border-[#1f6d4f]/50 hover:bg-[#1f6d4f]/5 transition-colors">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
                  <div className="text-center text-[#171512]/40">
                    {uploading ? <Loader2 size={18} className="animate-spin mx-auto" /> : <Upload size={18} className="mx-auto" />}
                    <span className="text-[10px] block mt-1">{uploading ? "変換中" : "写真を追加"}</span>
                  </div>
                </label>
              )}
              {imageKeys.length === 0 && !uploading && (
                <div className="flex items-center gap-2 text-xs text-[#171512]/45 self-center">
                  <ImageIcon size={14} /> なしでOK。AIが生成します。
                </div>
              )}
            </div>
          </section>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

          <div className="flex items-center justify-between gap-4 pb-10">
            <p className="text-xs text-[#171512]/45">生成には30〜60秒ほどかかります。編集や更新はクレジットを消費しません。</p>
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1f6d4f] text-white font-medium disabled:opacity-50 hover:bg-[#185840] transition-colors shrink-0"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              AIでサイトを生成（1クレジット）
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
