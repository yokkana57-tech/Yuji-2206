import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, BarChart3, Trash2, Eye, MousePointerClick, TrendingUp, AlertTriangle, Loader2, Store, Inbox, CheckCircle2 } from "lucide-react";
import { AdminShell } from "../components/admin";
import { imageSrc } from "../../shared/media";
import { BUSINESS_CATEGORIES } from "../../shared/site-model";

const catLabel = (v: string) => BUSINESS_CATEGORIES.find((c) => c.value === v)?.label ?? v;

const statusChip: Record<string, { label: string; cls: string }> = {
  pending: { label: "待機中", cls: "bg-neutral-200 text-neutral-700" },
  writing: { label: "文章を生成中", cls: "bg-amber-100 text-amber-800" },
  imaging: { label: "写真を生成中", cls: "bg-amber-100 text-amber-800" },
  ready: { label: "公開中", cls: "bg-emerald-100 text-emerald-800" },
  failed: { label: "生成失敗", cls: "bg-red-100 text-red-700" },
};

export default function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => (await fetch("/api/sites")).json() as Promise<any>,
    refetchInterval: (q) => ((q.state.data as any)?.sites?.some((s: any) => ["writing", "imaging", "pending"].includes(s.generationStatus)) ? 3000 : false),
  });

  const del = useMutation({
    mutationFn: async (slug: string) => fetch(`/api/sites/${slug}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["credits"] });
    },
  });

  const sites = data?.sites ?? [];
  const totals = sites.reduce(
    (acc: any, s: any) => ({ pv: acc.pv + s.metrics.pv, conv: acc.conv + s.metrics.conversions }),
    { pv: 0, conv: 0 },
  );

  return (
    <AdminShell>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">店舗一覧</h1>
          <p className="text-sm text-[#171512]/55 mt-1">管理中 {sites.length} 店舗 ・ 合計 {totals.pv.toLocaleString()} PV ・ 予約/問い合わせ {totals.conv} 件</p>
        </div>
        <PlacesStatus />
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-sm text-[#171512]/50">読み込み中…</div>
      ) : sites.length === 0 ? (
        <div className="py-24 text-center">
          <Store size={36} className="mx-auto text-[#171512]/25 mb-4" />
          <p className="text-sm text-[#171512]/60 mb-5">まだ店舗がありません。1件目のサイトを作りましょう。</p>
          <Link href="/new" className="inline-block px-5 py-2.5 rounded-lg bg-[#1f6d4f] text-white text-sm font-medium">
            新規作成する
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((s: any) => {
            const chip = statusChip[s.generationStatus] ?? statusChip.pending;
            const busy = ["writing", "imaging", "pending"].includes(s.generationStatus);
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-[#171512]/10 overflow-hidden flex flex-col">
                <Link href={`/s/${s.slug}`} className="block aspect-[16/10] bg-neutral-100 relative">
                  {s.heroImageKey ? (
                    <img src={imageSrc(s.heroImageKey, 640)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-neutral-400">
                      {busy ? <Loader2 size={22} className="animate-spin" /> : <Store size={22} />}
                    </div>
                  )}
                  <span className={`absolute top-3 left-3 text-[11px] px-2 py-1 rounded-full font-medium ${chip.cls}`}>{chip.label}</span>
                </Link>

                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="font-semibold leading-tight truncate">{s.businessName}</h2>
                  <p className="text-xs text-[#171512]/50 mt-1 truncate">{catLabel(s.businessCategory)} ・ {s.address}</p>
                  {s.theme?.rationale && <p className="text-[11px] text-[#171512]/40 mt-1.5 line-clamp-2">{s.theme.rationale}</p>}

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <Metric icon={<Eye size={12} />} label="閲覧" value={s.metrics.pv} />
                    <Metric icon={<MousePointerClick size={12} />} label="予約/問合" value={s.metrics.conversions} />
                    <Metric icon={<TrendingUp size={12} />} label="転換率" value={`${s.metrics.cvr}%`} />
                  </div>

                  {s.generationStatus === "failed" && <p className="text-[11px] text-red-600 mt-3 line-clamp-2">{s.generationError}</p>}

                  <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-[#171512]/8">
                    <Link href={`/edit/${s.slug}`} className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-[#171512] text-white font-medium">
                      <Pencil size={12} /> 編集
                    </Link>
                    <Link href={`/reservations/${s.slug}`} className="relative p-2 rounded-lg hover:bg-black/5 text-[#171512]/70" title="予約・お問い合わせ一覧">
                      <Inbox size={15} />
                      {s.metrics.newReservations > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#c0392b] text-white text-[10px] font-semibold grid place-items-center">
                          {s.metrics.newReservations}
                        </span>
                      )}
                    </Link>
                    <Link href={`/analytics/${s.slug}`} className="p-2 rounded-lg hover:bg-black/5 text-[#171512]/70" title="解析">
                      <BarChart3 size={15} />
                    </Link>
                    <a href={`/s/${s.slug}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-black/5 text-[#171512]/70" title="公開サイトを開く">
                      <ExternalLink size={15} />
                    </a>
                    <button
                      onClick={() => confirm(`「${s.businessName}」を削除しますか？（元に戻せません）`) && del.mutate(s.slug)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                      title="削除"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

/** Google Places 連携の状態。キーの有無だけでなく、実際に呼べるかまで見る */
function PlacesStatus() {
  const { data } = useQuery({
    queryKey: ["config"],
    queryFn: async () => (await fetch("/api/config")).json() as Promise<any>,
    staleTime: 60_000,
  });
  const p = data?.places;
  if (!p) return null;

  if (p.ok) {
    return (
      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
        <CheckCircle2 size={14} /> Google Places 連携 有効（評価・口コミ・営業状況を取り込めます）
      </div>
    );
  }

  return (
    <div className="max-w-md text-xs px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-medium mb-1">
            {p.configured ? "Google Places が使えていません" : "GOOGLE_MAPS_API_KEY が未設定です"}
          </div>
          <p className="leading-relaxed opacity-90">{p.error}</p>
          <p className="leading-relaxed opacity-75 mt-1">
            地図の埋め込みは問題なく動きます。影響があるのは評価・口コミ・営業中バッジだけです。
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-[#f6f5f2] py-2">
      <div className="flex items-center justify-center gap-1 text-[10px] text-[#171512]/45">{icon}{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
