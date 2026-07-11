/**
 * Given a list of submission timestamps (ISO strings) for the current user,
 * returns:
 *  - todayCount: how many entries were posted today (local time)
 *  - streakDays: consecutive days including today the user has posted.
 *    If they didn't post today but posted yesterday, streak = days ending yesterday.
 *    If they haven't posted in >1 day, streak = 0.
 */
export function computeStreak(timestamps: string[]) {
  const days = new Set<string>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayCount = 0;
  const todayKey = fmt(today);

  for (const iso of timestamps) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const dayKey = fmt(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    days.add(dayKey);
    if (dayKey === todayKey) todayCount++;
  }

  let streakDays = 0;
  const cursor = new Date(today);
  // Allow starting from today; if today missing, allow starting yesterday.
  if (!days.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(fmt(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { todayCount, streakDays };
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
