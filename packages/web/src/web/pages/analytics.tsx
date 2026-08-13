import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { ArrowLeft, Eye, Users, MousePointerClick, TrendingUp } from "lucide-react";
import { AdminShell } from "../components/admin";

const RANGES = [
  { days: 7, label: "7日" },
  { days: 30, label: "30日" },
  { days: 90, label: "90日" },
  { days: 365, label: "1年" },
];

const TYPE_LABEL: Record<string, string> = {
  reserve_click: "予約ボタン",
  tel_click: "電話タップ",
  form_submit: "フォーム送信",
  map_click: "地図・経路",
};

const PAGE_LABEL: Record<string, string> = { home: "トップ", menu: "メニュー", info: "店舗情報" };

export default function Analytics() {
  const { slug } = useParams<{ slug: string }>();
  const [days, setDays] = useState(30);

  const { data } = useQuery({
    queryKey: ["analytics", slug, days],
    queryFn: async () => (await fetch(`/api/analytics/${slug}?days=${days}`)).json() as Promise<any>,
  });

  const t = data?.totals;

  return (
    <AdminShell>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/" className="p-2 -ml-2 rounded-lg hover:bg-black/5 text-[#171512]/70"><ArrowLeft size={17} /></Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{data?.site?.businessName ?? "…"}</h1>
          <p className="text-xs text-[#171512]/50">アクセス解析</p>
        </div>
        <div className="ml-auto flex items-center gap-0.5 bg-white rounded-lg p-0.5 border border-black/10">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setDays(r.days)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${days === r.days ? "bg-[#171512] text-white" : "text-[#171512]/55"}`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card icon={<Eye size={15} />} label="ページビュー" value={t?.pv ?? 0} />
        <Card icon={<Users size={15} />} label="訪問者数" value={t?.visitors ?? 0} />
        <Card icon={<MousePointerClick size={15} />} label="予約・問い合わせ" value={t?.conversions ?? 0} />
        <Card icon={<TrendingUp size={15} />} label="転換率" value={`${t?.cvr ?? 0}%`} />
      </div>

      <div className="bg-white rounded-2xl border border-black/10 p-5 mb-4">
        <h2 className="text-sm font-semibold mb-4">日別の推移</h2>
        <div className="h-72">
          {data?.series?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series}>
                <defs>
                  <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1f6d4f" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1f6d4f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000010" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#17151280" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#17151280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #00000015", fontSize: 12 }} />
                <Area type="monotone" dataKey="pv" name="PV" stroke="#1f6d4f" strokeWidth={2} fill="url(#pv)" />
                <Area type="monotone" dataKey="conversions" name="予約・問い合わせ" stroke="#c0392b" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-sm text-[#171512]/40">まだデータがありません</div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-black/10 p-5">
          <h2 className="text-sm font-semibold mb-4">ページ別の閲覧数</h2>
          <div className="h-56">
            {data?.byPage?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byPage.map((p: any) => ({ ...p, name: PAGE_LABEL[p.pageKind] ?? p.pageKind }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#00000010" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#17151280" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#17151280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #00000015", fontSize: 12 }} />
                  <Bar dataKey="pv" name="PV" fill="#171512" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-[#171512]/40">まだデータがありません</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-black/10 p-5">
          <h2 className="text-sm font-semibold mb-4">アクションの内訳</h2>
          {data?.byType?.length ? (
            <div className="space-y-2.5">
              {data.byType.map((r: any) => (
                <div key={r.type} className="flex items-center gap-3">
                  <span className="text-sm w-28 shrink-0">{TYPE_LABEL[r.type] ?? r.type}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#f6f5f2] overflow-hidden">
                    <div className="h-full rounded-full bg-[#1f6d4f]" style={{ width: `${Math.round((r.n / Math.max(...data.byType.map((x: any) => x.n))) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold tabular-nums w-10 text-right">{r.n}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 grid place-items-center text-sm text-[#171512]/40">まだデータがありません</div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-2xl border border-black/10 p-4">
      <div className="flex items-center gap-1.5 text-xs text-[#171512]/50">{icon}{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1.5">{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}
