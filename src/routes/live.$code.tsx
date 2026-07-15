import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MOODS } from "@/lib/session";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Users, Heart } from "lucide-react";
import { subsInSession } from "@/lib/events";

export const Route = createFileRoute("/live/$code")({
  head: () => ({
    meta: [
      { title: "YururiMap Live" },
      { name: "description", content: "Live event results — YururiMap" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LivePage,
});

type Sub = { mood: string; mood_color: string; timestamp: string; session_id: string };
type EventSession = { id: string; shared_code: string; label: string; started_at: string; ended_at: string | null; created_by: string };

function LivePage() {
  const { code } = Route.useParams();

  const groupQ = useQuery({
    queryKey: ["live-group", code],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("*").eq("shared_code", code).maybeSingle();
      return data;
    },
    refetchInterval: 5000,
  });
  const subsQ = useQuery({
    queryKey: ["live-subs", code],
    queryFn: async () => {
      const { data } = await supabase.from("submissions").select("mood,mood_color,timestamp,session_id").eq("shared_code", code).limit(5000);
      return (data ?? []) as Sub[];
    },
    refetchInterval: 4000,
  });
  const sessionsQ = useQuery({
    queryKey: ["live-sessions", code],
    queryFn: async () => {
      const { data } = await supabase.from("event_sessions").select("*").eq("shared_code", code).order("started_at", { ascending: true });
      return (data ?? []) as EventSession[];
    },
    refetchInterval: 4000,
  });

  const groupName = groupQ.data?.name?.trim() || code;
  const subs = subsQ.data ?? [];
  const sessions = sessionsQ.data ?? [];
  const liveSession = sessions.find((s) => s.ended_at === null) ?? null;
  const participants = new Set(subs.map((s) => s.session_id)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 text-slate-900">
      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#EC4899" }}>
              Yururi<span style={{ color: "#A855F7" }}>Map</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">Happy &amp; Sad Map</p>
          </div>
          {liveSession && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
          <div className="flex-1" />
          <div className="text-2xl font-bold truncate">{groupName}</div>
        </div>

        {/* Big stats */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <StatCard icon={<Users className="w-7 h-7 text-blue-500" />} label="参加人数（推定） / People" value={participants} />
          <StatCard icon={<Heart className="w-7 h-7 text-pink-500 fill-pink-500" />} label="投稿総数 / Posts" value={subs.length} />
        </div>

        {/* Sessions row */}
        {sessions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center">
            <div className="text-lg font-bold text-slate-600">集計待機中 / Waiting for organizer to start a session…</div>
            <div className="text-sm text-slate-500 mt-1">主催者が「集計 ON」を押すとここにライブ集計が表示されます。</div>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(sessions.length, 3)}, minmax(0,1fr))` }}>
            {sessions.map((s, i) => (
              <LiveSessionCard key={s.id} index={i + 1} session={s} subs={subs} isLive={s.ended_at === null} />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {MOODS.map((m) => (
            <div key={m.ja} className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: m.color, color: "white" }}>
                {m.emoji}
              </span>
              <div>
                <div className="text-sm font-bold">{m.ja}</div>
                <div className="text-[10px] text-slate-500">{m.en}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-400">
          Auto-refresh every 4s · Code: <span className="font-mono">{code}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 flex items-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-500 font-medium">{label}</div>
        <div className="text-5xl font-extrabold tabular-nums leading-tight">{value.toLocaleString()}</div>
      </div>
    </div>
  );
}

function circled(n: number) {
  const c = ["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩"];
  return c[n - 1] ?? `#${n}`;
}

function LiveSessionCard({ index, session, subs, isLive }: { index: number; session: EventSession; subs: Sub[]; isLive: boolean }) {
  const inSession = subsInSession(subs, session);
  const data = MOODS.map((m) => ({ name: m.ja, value: inSession.filter((s) => s.mood === m.ja).length, fill: m.color }))
    .filter((d) => d.value > 0);
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`rounded-3xl bg-white border p-5 text-center ${isLive ? "border-emerald-400 ring-4 ring-emerald-100" : "border-slate-200"}`}>
      <div className="text-lg font-bold">集計{circled(index)} {isLive && <span className="text-xs text-emerald-600">（現在）</span>}</div>
      <div className="text-xs text-slate-500 mt-0.5 truncate" title={session.label}>{session.label || "—"}</div>
      <div className="text-[11px] text-slate-400">
        {fmt(session.started_at)} – {session.ended_at ? fmt(session.ended_at) : "集計中"}
      </div>
      <div className="text-sm font-bold text-slate-700 mt-1 mb-2">{inSession.length} 件</div>
      <div className="h-56">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-full border-2 border-dashed border-slate-200 text-slate-400 text-xs">
            no data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius="95%" isAnimationActive={false}>
                {data.map((_d, i) => <Cell key={i} fill={data[i].fill} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
