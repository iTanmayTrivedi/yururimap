// Shared event helpers previously exported from src/routes/events.tsx.
export type EventSession = {
  id: string;
  shared_code: string;
  label: string;
  started_at: string;
  ended_at: string | null;
  created_by: string;
};

export function subsInSession<T extends { timestamp: string }>(subs: T[], s: EventSession): T[] {
  const start = new Date(s.started_at).getTime();
  const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
  return subs.filter((sub) => {
    const t = new Date(sub.timestamp).getTime();
    return t >= start && t <= end;
  });
}
