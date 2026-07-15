import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MOODS, filterByRange, type TimeRange } from "@/lib/session";
import { RangeTabs } from "@/components/RangeTabs";
import { useLang, t } from "@/lib/i18n";
import { Loader2, Users, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "みんなの集計 / Stats" },
      { name: "description", content: "Aggregate mood statistics." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { lang } = useLang();
  const [range, setRange] = useState<TimeRange>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["stats-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions").select("mood, mood_color, session_id, timestamp")
        .order("timestamp", { ascending: false }).limit(5000);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  const ranged = filterByRange(data ?? [], range);
  const participants = new Set(ranged.map((d) => d.session_id)).size;
  const counts = MOODS.map((m) => ({
    name: m.ja, en: m.en, emoji: m.emoji, fill: m.color,
    count: ranged.filter((d) => d.mood === m.ja).length,
  }));

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">{t(lang, "みんなの集計", "Everyone's Stats")}</h2>
        <p className="text-xs text-muted-foreground">Everyone's Stats</p>
      </div>

      <RangeTabs value={range} onChange={setRange} />

      <div className="grid grid-cols-2 gap-2">
        <Stat icon={Users} label={t(lang, "参加人数", "People")} value={participants} suffix={t(lang, "人", "")} color="#3B82F6" />
        <Stat icon={BarChart3} label={t(lang, "投稿数", "Posts")} value={ranged.length} suffix={t(lang, "件", "")} color="#EC4899" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="text-sm text-destructive p-4 bg-card rounded-xl">{(error as Error).message}</div>
      ) : (
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counts} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="emoji" stroke="var(--muted-foreground)" fontSize={18} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {counts.map((c, i) => <Cell key={i} fill={c.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-5 gap-1 mt-2 text-center">
            {counts.map((c) => (
              <div key={c.name}>
                <div className="text-[10px] text-muted-foreground truncate">{lang === "ja" ? c.name : c.en}</div>
                <div className="text-sm font-bold tabular-nums" style={{ color: c.fill }}>{c.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, suffix, color }: { icon: React.ElementType; label: string; value: number; suffix: string; color: string }) {
  return (
    <div className="bg-card rounded-2xl p-3 border border-border shadow-sm flex items-center gap-3">
      <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-2xl font-extrabold tabular-nums" style={{ color }}>
          {value.toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-0.5">{suffix}</span>
        </div>
      </div>
    </div>
  );
}
