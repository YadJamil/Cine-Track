/** Current streak: consecutive daily connections ending today or yesterday. */
export function currentStreak(days: string[], now = new Date()): number {
  const dayMs = 86_400_000;
  const set = new Set(days);
  let cursor = now;
  if (!set.has(cursor.toISOString().slice(0, 10))) {
    cursor = new Date(cursor.getTime() - dayMs);
    if (!set.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - dayMs);
  }
  return streak;
}
