/**
 * Gamification rules (design doc §2.2 "Gamification", FR-7).
 * PURE functions so the whole XP / level / streak system is unit-testable and
 * so the API — not the phone — is the single source of truth for progress.
 */

export interface StreakState {
  streakCount: number;
  streakFreezes: number;
}

/** Same calendar day? Compared on UTC date only. */
function sameDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

/** Whole-day gap between two dates (UTC, date-only). */
export function dayGap(prev: Date, now: Date): number {
  const p = Date.parse(prev.toISOString().slice(0, 10));
  const n = Date.parse(now.toISOString().slice(0, 10));
  return Math.round((n - p) / 86_400_000);
}

/**
 * XP for one exercise attempt. Correct answers earn a base amount plus a small
 * speed bonus (answered under 4 s); wrong answers earn a token 1 XP for effort.
 */
export function xpForAttempt(correct: boolean, responseMs: number, base = 10): number {
  if (!correct) return 1;
  const speedBonus = responseMs > 0 && responseMs < 4000 ? 5 : 0;
  return base + speedBonus;
}

/**
 * Level from total XP. Levels get progressively harder: level n needs
 * 100 * n * (n-1) / 2 cumulative XP (100, 300, 600, 1000 ...).
 */
export function levelForXp(totalXp: number): number {
  let level = 1;
  while (100 * (level * (level + 1)) / 2 <= totalXp) level++;
  return level;
}

/**
 * Update a streak given the last active date. Same day → unchanged; next day →
 * +1; a single missed day is protected by a streak freeze if available; a bigger
 * gap resets the streak to 1.
 */
export function updateStreak(
  lastActiveDate: Date | null,
  now: Date,
  state: StreakState
): StreakState & { changed: boolean } {
  if (!lastActiveDate) return { streakCount: 1, streakFreezes: state.streakFreezes, changed: true };
  if (sameDay(lastActiveDate, now)) return { ...state, changed: false };

  const gap = dayGap(lastActiveDate, now);
  if (gap === 1) return { streakCount: state.streakCount + 1, streakFreezes: state.streakFreezes, changed: true };
  if (gap === 2 && state.streakFreezes > 0) {
    // one missed day, spend a freeze to keep the streak, then count today
    return { streakCount: state.streakCount + 1, streakFreezes: state.streakFreezes - 1, changed: true };
  }
  return { streakCount: 1, streakFreezes: state.streakFreezes, changed: true };
}

/** Achievement rules — returns codes newly unlocked this session. */
export function newlyUnlockedAchievements(
  opts: { totalXp: number; streakCount: number; level: number; owned: string[] }
): string[] {
  const unlocked: string[] = [];
  const has = (c: string) => opts.owned.includes(c) || unlocked.includes(c);
  if (opts.totalXp >= 1 && !has('first_xp')) unlocked.push('first_xp');
  if (opts.streakCount >= 3 && !has('streak_3')) unlocked.push('streak_3');
  if (opts.streakCount >= 7 && !has('streak_7')) unlocked.push('streak_7');
  if (opts.level >= 5 && !has('level_5')) unlocked.push('level_5');
  if (opts.totalXp >= 1000 && !has('xp_1000')) unlocked.push('xp_1000');
  return unlocked;
}
