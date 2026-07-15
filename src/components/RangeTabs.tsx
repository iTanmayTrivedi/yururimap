import type { TimeRange } from "@/lib/session";

const RANGES: { v: TimeRange; ja: string; en: string }[] = [
  { v: "all", ja: "全期間", en: "All" },
  { v: "today", ja: "今日", en: "Today" },
  { v: "week", ja: "今週", en: "Week" },
];

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
