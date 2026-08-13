import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutGrid, Plus, Coins } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function useCredits() {
  return useQuery({
    queryKey: ["credits"],
    queryFn: async () => (await fetch("/api/credits")).json() as Promise<{ balance: number; ledger: any[] }>,
  });
}

export function AdminShell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const [loc] = useLocation();
  const { data } = useCredits();

  // 公開サイトを見た後に管理画面へ戻ったとき、店舗用のSEOタグが残らないよう戻す
  useEffect(() => {
    document.title = "InstantSite｜店舗サイト作成・管理";
    document.head.querySelectorAll("[data-seo-managed]").forEach((el) => el.remove());
  }, [loc]);

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-[#171512]" style={{ fontFamily: '"Zen Kaku Gothic New", sans-serif' }}>
      <header className="sticky top-0 z-40 bg-[#f6f5f2]/90 backdrop-blur border-b border-[#171512]/10">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#171512] text-[#f6f5f2] grid place-items-center text-sm font-bold" style={{ fontFamily: "Jost, sans-serif" }}>
              IS
            </span>
            <span className="font-semibold tracking-tight text-[15px]">InstantSite</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/" className={`px-3 py-1.5 rounded-lg transition-colors ${loc === "/" ? "bg-[#171512] text-[#f6f5f2]" : "hover:bg-black/5"}`}>
              <span className="inline-flex items-center gap-1.5"><LayoutGrid size={14} /> 店舗一覧</span>
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {right}
            <div className="hidden sm:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white border border-[#171512]/10">
              <Coins size={14} className="text-[#b8860b]" />
              <span className="tabular-nums font-semibold">{data?.balance ?? "–"}</span>
              <span className="text-[#171512]/50 text-xs">クレジット</span>
            </div>
            <Link href="/new" className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#1f6d4f] text-white font-medium hover:bg-[#185840] transition-colors">
              <Plus size={15} /> 新規作成
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-sm font-medium">{label}</span>
        {required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c0392b]/10 text-[#c0392b]">必須</span>}
        {hint && <span className="text-xs text-[#171512]/45">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#171512]/15 text-sm outline-none focus:border-[#1f6d4f] focus:ring-2 focus:ring-[#1f6d4f]/15 transition-all placeholder:text-[#171512]/30";
