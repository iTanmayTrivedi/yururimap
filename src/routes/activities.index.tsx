import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang, t } from "@/lib/i18n";
import { getSessionId } from "@/lib/session";
import { demoSnapshot, loadProfile } from "@/lib/profile";
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LIST, type ActivityRow, type ActivityType } from "@/lib/activities";
import { Sparkles, Plus, Heart, Loader2, MapPin, ExternalLink, Flag } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";

export const Route = createFileRoute("/activities/")({
  head: () => ({
    meta: [
      { title: "取り組み / Community Activities" },
      { name: "description", content: "Local, national and global community activities near you." },
    ],
  }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { lang } = useLang();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["activities-approved"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities")
        .select("*")
        .eq("status", "approved").eq("hidden", false)
        .order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });

  const likesQ = useQuery({
    queryKey: ["activity-likes-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_likes").select("activity_id");
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of data ?? []) {
        const id = (r as { activity_id: string }).activity_id;
        m.set(id, (m.get(id) ?? 0) + 1);
      }
      return m;
    },
  });

  const filtered = useMemo(() => (listQ.data ?? []).filter(a => filter === "all" || a.activity_type === filter), [listQ.data, filter]);
  const local = filtered.filter(a => a.scope === "single" || a.scope === "local" || a.scope === "regional");
  const national = filtered.filter(a => a.scope === "national");
  const global = filtered.filter(a => a.scope === "global");

  async function like(id: string) {
    try {
      const p = loadProfile();
      const { error } = await supabase.from("activity_likes").insert({
        activity_id: id, session_id: getSessionId(),
        age_group: p.ageGroup ?? null, gender: p.gender ?? null, home_area: p.homeArea ?? null,
      });
      if (error) {
        if (error.code === "23505") { toast.info(t(lang, "すでに応援しました", "You already liked this")); return; }
        throw error;
      }
      toast.success(t(lang, "応援しました！", "Thanks!"));
      qc.invalidateQueries({ queryKey: ["activity-likes-counts"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold inline-flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          {t(lang, "取り組み", "Community Activities")}
        </h2>
        <Link to="/activities/new"
          className="inline-flex items-center gap-1 rounded-full bg-purple-500 text-white px-3 py-1.5 text-xs font-bold shadow-sm active:scale-[0.97]">
          <Plus className="w-3.5 h-3.5" /> {t(lang, "投稿", "Post")}
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} label={t(lang, "すべて", "All")} color="#6B7280" />
        {ACTIVITY_TYPE_LIST.map((m) => (
          <Chip key={m.type} active={filter === m.type} onClick={() => setFilter(m.type)}
            label={lang === "ja" ? m.ja : m.en} color={m.color} />
        ))}
      </div>

      {listQ.isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Section title={t(lang, "地方の取り組み", "Local & Regional")} rows={local} likes={likesQ.data ?? new Map()} onLike={like} onReport={setReportTarget} />
          <Section title={t(lang, "全国の取り組み", "Nationwide")} rows={national} likes={likesQ.data ?? new Map()} onLike={like} onReport={setReportTarget} />
          <Section title={t(lang, "世界の取り組み", "Worldwide")} rows={global} likes={likesQ.data ?? new Map()} onLike={like} onReport={setReportTarget} />
        </>
      )}

      <ReportDialog open={!!reportTarget} onClose={() => setReportTarget(null)} target={{ activity_id: reportTarget ?? undefined }} />
    </div>
  );
}

function Chip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button onClick={onClick}
      className="shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold"
      style={active ? { backgroundColor: color, color: "#fff", borderColor: color }
        : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
      {label}
    </button>
  );
}

function Section({ title, rows, likes, onLike, onReport }:
  { title: string; rows: ActivityRow[]; likes: Map<string, number>;
    onLike: (id: string) => void; onReport: (id: string) => void }) {
  const { lang } = useLang();
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-foreground">{title} <span className="text-xs font-normal text-muted-foreground">({rows.length})</span></h3>
      <div className="space-y-2">
        {rows.map((a) => {
          const meta = ACTIVITY_TYPES[a.activity_type];
          const Icon = meta.icon;
          const count = likes.get(a.id) ?? 0;
          return (
            <div key={a.id} className="rounded-2xl border bg-card overflow-hidden shadow-sm"
              style={{ borderColor: `${meta.color}55` }}>
              {a.photo_url && <img src={a.photo_url} alt="" className="w-full h-36 object-cover" />}
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: meta.soft, border: `2px solid ${meta.color}` }}>
                    <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold" style={{ color: meta.color }}>{lang === "ja" ? meta.ja : meta.en}</div>
                    <div className="text-sm font-bold truncate">{a.title}</div>
                  </div>
                </div>
                <p className="text-xs whitespace-pre-wrap line-clamp-3">{a.description}</p>
                {a.place_label && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {a.place_label}
                  </div>
                )}
                {a.official_url && (
                  <a href={a.official_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-purple-700 underline break-all">
                    <ExternalLink className="w-3 h-3" /> {a.official_url}
                  </a>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => onLike(a.id)}
                    className="flex-1 min-h-[40px] rounded-xl text-white font-bold text-xs inline-flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: meta.color }}>
                    <Heart className="w-3.5 h-3.5" /> {t(lang, "応援", "Like")} <span className="font-extrabold">{count}</span>
                  </button>
                  <button onClick={() => onReport(a.id)}
                    className="min-h-[40px] px-3 rounded-xl border border-border text-muted-foreground text-xs inline-flex items-center gap-1">
                    <Flag className="w-3 h-3" /> {t(lang, "通報", "Report")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
