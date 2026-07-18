import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { ACTIVITY_TYPES, type ActivityRow } from "@/lib/activities";
import { POST_TYPES, type PostRow } from "@/lib/posts";
import { Loader2, ShieldCheck, LogIn, Check, X, Download, Flag, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — YururiMap" }] }),
  component: AdminPage,
});

type Tab = "activities" | "resolutions" | "reports";

type ResolutionRow = {
  id: string; related_post_id: string; description: string; photo_url: string | null;
  session_id: string; status: string; created_at: string;
};

type ReportRow = {
  id: string; post_id: string | null; activity_id: string | null; resolution_id: string | null;
  reason: string | null; status: string; created_at: string;
};

function AdminPage() {
  const { lang } = useLang();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<Tab>("activities");

  async function refresh() {
    const { data } = await supabase.rpc("is_admin");
    setIsAdmin(!!data);
  }
  useEffect(() => { refresh(); }, []);

  async function login() {
    const { data, error } = await supabase.rpc("claim_admin", { _passphrase: pass });
    if (error) { toast.error(error.message); return; }
    if (data) { toast.success("Admin unlocked"); setPass(""); refresh(); }
    else toast.error(t(lang, "パスフレーズが違います", "Wrong passphrase"));
  }

  if (isAdmin === null) return <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  if (!isAdmin) {
    return (
      <div className="max-w-sm mx-auto space-y-3 mt-8">
        <h1 className="text-lg font-bold inline-flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> Admin</h1>
        <p className="text-xs text-muted-foreground">{t(lang, "管理者パスフレーズを入力してください。", "Enter the admin passphrase.")}</p>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
          className="w-full rounded-xl border border-input bg-card p-2.5 text-sm" placeholder="passphrase" />
        <button onClick={login} className="w-full min-h-[44px] rounded-xl bg-emerald-600 text-white font-bold inline-flex items-center justify-center gap-2">
          <LogIn className="w-4 h-4" /> {t(lang, "ログイン", "Log in")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold inline-flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> Admin</h1>
        <ExportCsvButton />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        <TabBtn active={tab === "activities"} onClick={() => setTab("activities")} icon={<Sparkles className="w-3.5 h-3.5" />} label={t(lang, "取り組み承認", "Activities")} />
        <TabBtn active={tab === "resolutions"} onClick={() => setTab("resolutions")} icon={<CheckCircle2 className="w-3.5 h-3.5" />} label={t(lang, "解決報告", "Resolutions")} />
        <TabBtn active={tab === "reports"} onClick={() => setTab("reports")} icon={<Flag className="w-3.5 h-3.5" />} label={t(lang, "通報", "Reports")} />
      </div>
      {tab === "activities" && <ActivitiesTab />}
      {tab === "resolutions" && <ResolutionsTab />}
      {tab === "reports" && <ReportsTab />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className="shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold inline-flex items-center gap-1"
      style={active ? { backgroundColor: "#10B981", color: "#fff", borderColor: "#10B981" }
        : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
      {icon} {label}
    </button>
  );
}

function ActivitiesTab() {
  const qc = useQueryClient();
  const { lang } = useLang();
  const q = useQuery({
    queryKey: ["admin-activities-pending"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities").select("*").eq("status", "pending").order("created_at");
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });
  async function decide(id: string, approve: boolean) {
    const { error } = await supabase.from("activities")
      .update({ status: approve ? "approved" : "rejected", reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin-activities-pending"] });
  }
  if (q.isLoading) return <Loader />;
  if (!q.data?.length) return <Empty label={t(lang, "承認待ちはありません", "Nothing pending")} />;
  return (
    <div className="space-y-2">
      {q.data.map((a) => {
        const meta = ACTIVITY_TYPES[a.activity_type];
        return (
          <div key={a.id} className="rounded-2xl border p-3 space-y-2" style={{ borderColor: `${meta.color}55` }}>
            {a.photo_url && <img src={a.photo_url} alt="" className="w-full h-32 object-cover rounded-xl" />}
            <div className="text-[10px] font-bold" style={{ color: meta.color }}>{lang === "ja" ? meta.ja : meta.en}</div>
            <div className="text-sm font-bold">{a.title}</div>
            <p className="text-xs whitespace-pre-wrap">{a.description}</p>
            {a.place_label && <div className="text-[11px] text-muted-foreground">📍 {a.place_label}</div>}
            <ApproveButtons onApprove={() => decide(a.id, true)} onReject={() => decide(a.id, false)} />
          </div>
        );
      })}
    </div>
  );
}

function ResolutionsTab() {
  const qc = useQueryClient();
  const { lang } = useLang();
  const q = useQuery({
    queryKey: ["admin-resolutions-pending"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resolution_reports").select("*").eq("status", "pending").order("created_at");
      if (error) throw error;
      return (data ?? []) as ResolutionRow[];
    },
  });
  async function decide(r: ResolutionRow, approve: boolean) {
    const { error } = await supabase.from("resolution_reports")
      .update({ status: approve ? "approved" : "rejected", reviewed_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    if (approve) {
      await supabase.from("posts").update({ resolved: true }).eq("id", r.related_post_id);
    }
    toast.success(approve ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin-resolutions-pending"] });
  }
  if (q.isLoading) return <Loader />;
  if (!q.data?.length) return <Empty label={t(lang, "承認待ちはありません", "Nothing pending")} />;
  return (
    <div className="space-y-2">
      {q.data.map((r) => (
        <div key={r.id} className="rounded-2xl border border-pink-200 p-3 space-y-2">
          {r.photo_url && <img src={r.photo_url} alt="" className="w-full h-32 object-cover rounded-xl" />}
          <div className="text-[10px] font-bold text-pink-600">{t(lang, "解決報告", "Resolution")}</div>
          <p className="text-xs whitespace-pre-wrap">{r.description}</p>
          <div className="text-[10px] text-muted-foreground">post: {r.related_post_id.slice(0, 8)}…</div>
          <ApproveButtons onApprove={() => decide(r, true)} onReject={() => decide(r, false)} />
        </div>
      ))}
    </div>
  );
}

function ReportsTab() {
  const qc = useQueryClient();
  const { lang } = useLang();
  const q = useQuery({
    queryKey: ["admin-reports-open"],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_reports").select("*").eq("status", "open").order("created_at");
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });
  async function dismiss(id: string) {
    const { error } = await supabase.from("post_reports").update({ status: "dismissed" }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-reports-open"] });
  }
  async function hide(r: ReportRow) {
    if (r.post_id) await supabase.from("posts").update({ hidden: true }).eq("id", r.post_id);
    if (r.activity_id) await supabase.from("activities").update({ hidden: true }).eq("id", r.activity_id);
    if (r.resolution_id) await supabase.from("resolution_reports").update({ status: "rejected" }).eq("id", r.resolution_id);
    await supabase.from("post_reports").update({ status: "actioned" }).eq("id", r.id);
    toast.success(t(lang, "非表示にしました", "Hidden"));
    qc.invalidateQueries({ queryKey: ["admin-reports-open"] });
  }
  if (q.isLoading) return <Loader />;
  if (!q.data?.length) return <Empty label={t(lang, "通報はありません", "No reports")} />;
  return (
    <div className="space-y-2">
      {q.data.map((r) => (
        <div key={r.id} className="rounded-2xl border border-red-200 p-3 space-y-2">
          <div className="text-[10px] font-bold text-red-600">{t(lang, "通報", "Report")}</div>
          <p className="text-xs whitespace-pre-wrap">{r.reason ?? "—"}</p>
          <div className="text-[10px] text-muted-foreground">
            {r.post_id && <>post: {r.post_id.slice(0, 8)}… </>}
            {r.activity_id && <>activity: {r.activity_id.slice(0, 8)}… </>}
            {r.resolution_id && <>resolution: {r.resolution_id.slice(0, 8)}…</>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => hide(r)} className="flex-1 min-h-[38px] rounded-xl bg-red-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1">
              <X className="w-3.5 h-3.5" /> {t(lang, "投稿を非表示", "Hide post")}
            </button>
            <button onClick={() => dismiss(r.id)} className="min-h-[38px] px-3 rounded-xl border border-border text-xs">
              {t(lang, "却下", "Dismiss")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ApproveButtons({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  const { lang } = useLang();
  return (
    <div className="flex gap-2">
      <button onClick={onApprove} className="flex-1 min-h-[38px] rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center justify-center gap-1">
        <Check className="w-3.5 h-3.5" /> {t(lang, "承認", "Approve")}
      </button>
      <button onClick={onReject} className="flex-1 min-h-[38px] rounded-xl border border-border text-muted-foreground text-xs inline-flex items-center gap-1 justify-center">
        <X className="w-3.5 h-3.5" /> {t(lang, "却下", "Reject")}
      </button>
    </div>
  );
}

function Loader() { return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>; }
function Empty({ label }: { label: string }) { return <div className="py-8 text-center text-xs text-muted-foreground">{label}</div>; }

function ExportCsvButton() {
  const { lang } = useLang();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const [postsRes, likesRes] = await Promise.all([
        supabase.from("posts").select("*"),
        supabase.from("post_likes").select("*"),
      ]);
      if (postsRes.error) throw postsRes.error;
      if (likesRes.error) throw likesRes.error;
      const posts = (postsRes.data ?? []) as (PostRow & { age_group?: string; gender?: string; home_area?: string; resolved?: boolean; hidden?: boolean })[];
      const likes = (likesRes.data ?? []) as { id: string; post_id: string; session_id: string; created_at: string; age_group?: string; gender?: string; home_area?: string }[];
      const rows: string[] = [];
      rows.push(["kind","id","type","title","description","place_label","lat","lng","resolved","hidden","age_group","gender","home_area","created_at"].join(","));
      for (const p of posts) {
        rows.push(["post", p.id, p.type, csv(p.title), csv(p.description), csv(p.place_label), p.lat ?? "", p.lng ?? "", p.resolved ? 1 : 0, p.hidden ? 1 : 0, csv(p.age_group), csv(p.gender), csv(p.home_area), p.created_at].join(","));
      }
      for (const l of likes) {
        rows.push(["like", l.id, "", "", "", "", "", "", "", "", csv(l.age_group), csv(l.gender), csv(l.home_area), l.created_at, `post=${l.post_id}`].join(","));
      }
      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `yururimap-export-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  function csv(v: string | null | undefined) {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }
  return (
    <button onClick={run} disabled={busy} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60">
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} CSV
    </button>
  );
}
