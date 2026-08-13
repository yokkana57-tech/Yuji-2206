import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, CalendarDays, Users, Trash2, ExternalLink, Inbox } from "lucide-react";
import { AdminShell } from "../components/admin";

type Reservation = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  partySize: number | null;
  message: string | null;
  status: string;
  createdAt: string;
};

const STATUSES = [
  { value: "new", label: "未対応", cls: "bg-amber-100 text-amber-800" },
  { value: "contacted", label: "連絡済み", cls: "bg-sky-100 text-sky-800" },
  { value: "confirmed", label: "予約確定", cls: "bg-emerald-100 text-emerald-800" },
  { value: "done", label: "来店済み", cls: "bg-neutral-200 text-neutral-700" },
  { value: "canceled", label: "キャンセル", cls: "bg-red-100 text-red-700" },
];

const jst = (v: string) =>
  new Date(v).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function Reservations() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["reservations", slug],
    queryFn: async () => (await fetch(`/api/reservations/${slug}`)).json() as Promise<any>,
    refetchInterval: 30000,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/reservations/${slug}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations", slug] }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => fetch(`/api/reservations/${slug}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations", slug] });
      qc.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const rows: Reservation[] = data?.reservations ?? [];
  const counts: Record<string, number> = data?.counts ?? {};

  return (
    <AdminShell>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/" className="p-2 rounded-lg hover:bg-black/5 text-[#171512]/70">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">
            予約・お問い合わせ
          </h1>
          <p className="text-sm text-[#171512]/55 mt-1">
            {data?.site?.businessName ?? slug} ・ 全 {rows.length} 件
            {counts.new ? ` ・ 未対応 ${counts.new} 件` : ""}
          </p>
        </div>
        <a
          href={`/s/${slug}#reserve`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[#171512]/12 hover:bg-black/5"
        >
          <ExternalLink size={13} /> フォームを見る
        </a>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-sm text-[#171512]/50">読み込み中…</div>
      ) : rows.length === 0 ? (
        <div className="py-24 text-center">
          <Inbox size={36} className="mx-auto text-[#171512]/25 mb-4" />
          <p className="text-sm text-[#171512]/60">
            まだ予約・お問い合わせは届いていません。
            <br />
            公開サイトの下部フォームから送信されると、ここに一覧で表示されます。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const chip = STATUSES.find((s) => s.value === r.status) ?? STATUSES[0];
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-[#171512]/10 p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <span className={`text-[11px] px-2 py-1 rounded-full font-medium shrink-0 ${chip.cls}`}>{chip.label}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold leading-tight">{r.name} 様</div>
                    <div className="text-xs text-[#171512]/45 mt-0.5">受信 {jst(r.createdAt)}</div>
                  </div>
                  <select
                    value={r.status}
                    onChange={(e) => setStatus.mutate({ id: r.id, status: e.target.value })}
                    className="text-xs px-2.5 py-2 rounded-lg border border-[#171512]/12 bg-white"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => confirm("この問い合わせを削除しますか？") && del.mutate(r.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                    title="削除"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-2 mt-4 text-sm">
                  {r.phone && (
                    <Row icon={<Phone size={13} />} label="電話">
                      <a href={`tel:${r.phone}`} className="text-[#1f6d4f] font-medium">{r.phone}</a>
                    </Row>
                  )}
                  {r.email && (
                    <Row icon={<Mail size={13} />} label="メール">
                      <a href={`mailto:${r.email}`} className="text-[#1f6d4f] font-medium break-all">{r.email}</a>
                    </Row>
                  )}
                  {(r.preferredDate || r.preferredTime) && (
                    <Row icon={<CalendarDays size={13} />} label="希望日時">
                      {[r.preferredDate, r.preferredTime].filter(Boolean).join(" ")}
                    </Row>
                  )}
                  {r.partySize != null && (
                    <Row icon={<Users size={13} />} label="人数">{r.partySize} 名</Row>
                  )}
                </div>

                {r.message && (
                  <p className="text-sm leading-relaxed mt-3 pt-3 border-t border-[#171512]/8 whitespace-pre-wrap text-[#171512]/80">
                    {r.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] text-[#171512]/45">{icon}{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
