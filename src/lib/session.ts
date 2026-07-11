export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("niko_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("niko_session_id", id);
  }
  return id;
}

// New palette (YururiMap): pink heart for Happy, then orange / green / blue / purple.
export const MOODS = [
  { ja: "ニコニコ", en: "Happy",     emoji: "💖", color: "#EC4899", soft: "#FCE7F3", textOnColor: "#FFFFFF", heart: true  },
  { ja: "まあまあ", en: "Good",      emoji: "🙂", color: "#F97316", soft: "#FFEDD5", textOnColor: "#FFFFFF", heart: false },
  { ja: "ふつう",   en: "Neutral",   emoji: "😐", color: "#10B981", soft: "#D1FAE5", textOnColor: "#FFFFFF", heart: false },
  { ja: "イマイチ", en: "Not Great", emoji: "😟", color: "#3B82F6", soft: "#DBEAFE", textOnColor: "#FFFFFF", heart: false },
  { ja: "しょんぼり", en: "Sad",     emoji: "😢", color: "#A855F7", soft: "#EDE9FE", textOnColor: "#FFFFFF", heart: false },
] as const;

export type Mood = (typeof MOODS)[number];

export function roundCoord(n: number): number {
  return Math.round(n / 0.005) * 0.005;
}

export type TimeRange = "today" | "week" | "all";

export function filterByRange<T extends { timestamp: string }>(rows: T[], range: TimeRange): T[] {
  if (range === "all") return rows;
  const now = Date.now();
  const cutoff =
    range === "today"
      ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })()
      : now - 7 * 24 * 60 * 60 * 1000;
  return rows.filter((r) => new Date(r.timestamp).getTime() >= cutoff);
}
