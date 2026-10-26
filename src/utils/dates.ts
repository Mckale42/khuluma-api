/** Date-key helpers used by word-of-day (YYYY-MM-DD) and the weekly league. */
export function dateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** ISO week key like "2026-W38", used to bucket the weekly XP league. */
export function weekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Which entry of a word pool to show on [d]: the UTC day of the year modulo the pool size (same word all day, new word tomorrow). */
export function wordIndexForDay(d: Date, poolSize: number): number {
  if (poolSize <= 0) return 0;
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86_400_000);
  return dayOfYear % poolSize;
}
