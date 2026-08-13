import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, AlertTriangle, PenLine, Camera, LayoutTemplate } from "lucide-react";
import { AdminShell } from "../components/admin";

const STEPS = [
  { key: "writing", label: "文章とテーマを設計中", icon: PenLine },
  { key: "imaging", label: "写真を生成し、地図情報を取得中", icon: Camera },
  { key: "ready", label: "ページを組み立て中", icon: LayoutTemplate },
] as const;

const ORDER = ["pending", "writing", "imaging", "ready"];

export default function Generating() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  const { data } = useQuery({
    queryKey: ["gen", slug],
    queryFn: async () => (await fetch(`/api/sites/${slug}/status`)).json() as Promise<{ status: string; error: string | null }>,
    refetchInterval: (q) => (["ready", "failed"].includes((q.state.data as any)?.status) ? false : 2000),
  });

  useEffect(() => {
    if (data?.status === "ready") {
      const t = setTimeout(() => navigate(`/edit/${slug}`), 900);
      return () => clearTimeout(t);
    }
  }, [data?.status, slug, navigate]);

  const idx = ORDER.indexOf(data?.status ?? "pending");
  const failed = data?.status === "failed";

  return (
    <AdminShell>
      <div className="max-w-lg mx-auto py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight mb-2">サイトを生成しています</h1>
        <p className="text-sm text-[#171512]/55 mb-10">30〜60秒ほどかかります。このページは開いたままにしてください。</p>

        <div className="bg-white rounded-2xl border border-[#171512]/10 p-6 text-left space-y-4">
          {STEPS.map((s, i) => {
            const done = idx > ORDER.indexOf(s.key) || data?.status === "ready";
            const active = data?.status === s.key;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${done ? "bg-emerald-100 text-emerald-700" : active ? "bg-amber-100 text-amber-700" : "bg-[#f6f5f2] text-[#171512]/30"}`}>
                  {done ? <Check size={15} /> : active ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
                </span>
                <span className={`text-sm ${done || active ? "text-[#171512]" : "text-[#171512]/40"}`}>{s.label}</span>
                {i === STEPS.length - 1 && data?.status === "ready" && <span className="ml-auto text-xs text-emerald-700">完了</span>}
              </div>
            );
          })}
        </div>

        {failed && (
          <div className="mt-6 text-left text-sm bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 font-medium text-red-700 mb-1">
              <AlertTriangle size={15} /> 生成に失敗しました
            </div>
            <p className="text-red-600 text-xs break-all">{data?.error}</p>
            <p className="text-xs text-red-600/80 mt-2">消費したクレジットは自動で返却されています。</p>
            <button onClick={() => navigate("/new")} className="mt-3 text-xs px-3 py-2 rounded-lg bg-red-600 text-white">
              もう一度作る
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
