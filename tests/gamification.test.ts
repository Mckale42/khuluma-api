import {
  xpForAttempt, levelForXp, updateStreak, dayGap, newlyUnlockedAchievements
} from '../src/services/gamification';

describe('xpForAttempt', () => {
  it('gives base XP for a correct answer', () => {
    expect(xpForAttempt(true, 5000)).toBe(10);
  });
  it('adds a speed bonus for fast correct answers', () => {
    expect(xpForAttempt(true, 2000)).toBe(15);
  });
  it('gives 1 XP for a wrong answer', () => {
    expect(xpForAttempt(false, 1000)).toBe(1);
  });
});

describe('levelForXp', () => {
  it('starts everyone at level 1', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
  });
  it('increases with cumulative XP', () => {
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(300)).toBe(3);
  });
});

describe('dayGap', () => {
  it('counts whole days between two dates', () => {
    expect(dayGap(new Date('2026-09-14T20:00:00Z'), new Date('2026-09-15T06:00:00Z'))).toBe(1);
    expect(dayGap(new Date('2026-09-14'), new Date('2026-09-14'))).toBe(0);
  });
});

describe('updateStreak', () => {
  const base = { streakCount: 4, streakFreezes: 1 };
  it('starts a streak for a brand-new learner', () => {
    const r = updateStreak(null, new Date('2026-09-16'), base);
    expect(r.streakCount).toBe(1);
    expect(r.changed).toBe(true);
  });
  it('does not change on the same day', () => {
    const r = updateStreak(new Date('2026-09-16T08:00:00Z'), new Date('2026-09-16T20:00:00Z'), base);
    expect(r.streakCount).toBe(4);
    expect(r.changed).toBe(false);
  });
  it('increments on a consecutive day', () => {
    const r = updateStreak(new Date('2026-09-15'), new Date('2026-09-16'), base);
    expect(r.streakCount).toBe(5);
  });
  it('spends a freeze to survive one missed day', () => {
    const r = updateStreak(new Date('2026-09-14'), new Date('2026-09-16'), base);
    expect(r.streakCount).toBe(5);
    expect(r.streakFreezes).toBe(0);
  });
  it('resets when the gap is too large and no freeze remains', () => {
    const r = updateStreak(new Date('2026-09-10'), new Date('2026-09-16'), { streakCount: 9, streakFreezes: 0 });
    expect(r.streakCount).toBe(1);
  });
});

describe('newlyUnlockedAchievements', () => {
  it('unlocks first_xp and streak_3 but not owned ones', () => {
    const unlocked = newlyUnlockedAchievements({ totalXp: 50, streakCount: 3, level: 1, owned: ['first_xp'] });
    expect(unlocked).toContain('streak_3');
    expect(unlocked).not.toContain('first_xp');
  });
});
