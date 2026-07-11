import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MOODS, filterByRange, type TimeRange } from "@/lib/session";
import { MapView } from "@/components/MapView";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "みんなのマップ / Public Map" },
      { name: "description", content: "See everyone's moods on the map." },
    ],
  }),
  component: MapPage,
});

const RANGES: { v: TimeRange; ja: string; en: string }[] = [
  { v: "all",   ja: "全期間", en: "All" },
  { v: "today", ja: "今日",   en: "Today" },
  { v: "week",  ja: "今週",   en: "Week" },
];

function MapPage() {
  const [range, setRange] = useState<TimeRange>("all");
  const [filter, setFilter] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("mood, mood_en, mood_color, rounded_lat, rounded_lng, timestamp")
        .order("timestamp", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const ranged = filterByRange(data ?? [], range);
  const filtered = ranged.filter((d) => !filter || d.mood === filter);
  const points = filtered
    .map((d) => {
      if (d.rounded_lat === null || d.rounded_lng === null) return null;
      return {
        lat: d.rounded_lat as number,
        lng: d.rounded_lng as number,
        color: d.mood_color,
        emoji: MOODS.find((m) => m.ja === d.mood)?.emoji,
        label: d.mood,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const noLocCount = filtered.filter((d) => d.rounded_lat === null && d.rounded_lng === null).length;
  const counts = MOODS.map((m) => ({ ...m, count: ranged.filter((d) => d.mood === m.ja).length }));

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">みんなのマップ</h2>
        <p className="text-sm text-muted-foreground">Public Map</p>
      </div>

      <RangeTabs value={range} onChange={setRange} />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="表示中 / Shown" value={points.length} />
        <Stat label="合計 / Total"   value={ranged.length} />
        <Stat label="位置なし / No loc" value={noLocCount} />
      </div>

      <div className="text-xs text-center rounded-xl py-2 px-3 bg-muted/60 border border-border">
        🔒 位置情報は500mグリッドで表示 / Locations shown on 500m grid
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <FilterChip active={filter === null} onClick={() => setFilter(null)} label="すべて" sub="All" />
        {MOODS.map((m) => (
          <FilterChip key={m.ja} active={filter === m.ja} onClick={() => setFilter(m.ja)}
            label={`${m.emoji} ${m.ja}`} color={m.color} />
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden border border-border shadow-md bg-card">
        {isLoading ? (
          <div className="h-[360px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="h-[360px] flex items-center justify-center text-sm text-destructive p-4 text-center">{(error as Error).message}</div>
        ) : (
          <ClientOnly fallback={<div className="h-[360px]" />}>
            <MapView points={points} height="360px" center={[36.5, 138.0]} zoom={5} fitToPoints={false} jitterDuplicates />
          </ClientOnly>
        )}
      </div>

      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-2">
        <h2 className="text-base font-semibold mb-2">気持ちの内訳 / Breakdown</h2>
        {counts.map((c) => (
          <div key={c.ja} className="flex items-center gap-3">
            <span className="text-2xl">{c.emoji}</span>
            <span className="flex-1 text-base">
              <span className="font-medium">{c.ja}</span>
              <span className="text-sm text-muted-foreground ml-1">{c.en}</span>
            </span>
            <span className="text-base font-bold tabular-nums" style={{ color: c.color }}>{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RangeTabs({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  return (
    <div className="grid grid-cols-3 bg-muted/60 rounded-xl p-1 border border-border">
      {RANGES.map((r) => {
        const active = r.v === value;
        return (
          <button key={r.v} onClick={() => onChange(r.v)}
            className="py-2 rounded-lg text-sm font-medium transition"
            style={{ backgroundColor: active ? "var(--card)" : "transparent",
                     color: active ? "#EC4899" : "var(--muted-foreground)",
                     boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : undefined }}>
            {r.ja}<span className="text-[10px] ml-1 opacity-70">{r.en}</span>
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-xl p-3 border border-border shadow-sm">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

function FilterChip({ active, onClick, label, sub, color }: { active: boolean; onClick: () => void; label: string; sub?: string; color?: string }) {
  return (
    <button onClick={onClick} className="shrink-0 px-3 py-2 rounded-full border text-sm font-medium transition-colors"
      style={active
        ? { backgroundColor: color ?? "var(--primary)", color: "#fff", borderColor: color ?? "var(--primary)" }
        : { backgroundColor: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}>
      {label}{sub && <span className="ml-1 opacity-70 text-xs">{sub}</span>}
    </button>
  );
}
