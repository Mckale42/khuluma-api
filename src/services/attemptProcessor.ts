/**
 * Applies one answered exercise to a learner: records the attempt, awards XP,
 * advances the streak, schedules the next spaced-repetition review, unlocks
 * achievements and bumps the weekly league. Used by BOTH the live endpoint
 * (POST /attempts) and the offline replay endpoint (POST /sync), so progress
 * made without a connection is worth exactly the same once it reconciles.
 */
import { Attempt } from '../models/Attempt';
import { Review } from '../models/Review';
import { LeagueEntry } from '../models/LeagueEntry';
import { ExerciseDoc } from '../models/Lesson';
import { isCorrect } from './grading';
import { xpForAttempt, levelForXp, updateStreak, newlyUnlockedAchievements } from './gamification';
import { sm2, qualityFromAttempt } from './spacedRepetition';
import { weekKey } from '../utils/dates';

export interface AttemptInput {
  exercise: ExerciseDoc;
  lessonId: string;
  answer: unknown;
  responseMs: number;
  /** When the learner actually answered (older than "now" for offline replays). */
  at: Date;
  clientId?: string;
}

export interface AttemptOutcome {
  correct: boolean;
  correctAnswer: string;
  xpAwarded: number;
  totalXp: number;
  level: number;
  streakCount: number;
  streakFreezes: number;
  newAchievements: string[];
  /** False when this clientId was already applied (a repeated sync batch). */
  applied: boolean;
}

export async function processAttempt(user: any, input: AttemptInput): Promise<AttemptOutcome> {
  const { exercise, lessonId, at } = input;
  const correct = isCorrect(input.answer, exercise.answer);
  const ms = Number(input.responseMs) || 0;

  // Idempotency: a queued answer that was already synced must not earn XP twice.
  if (input.clientId) {
    const existing = await Attempt.findOne({ userId: user.userId, clientId: input.clientId });
    if (existing) {
      return {
        correct: existing.correct, correctAnswer: exercise.answer, xpAwarded: 0,
        totalXp: user.totalXp, level: user.level, streakCount: user.streakCount,
        streakFreezes: user.streakFreezes, newAchievements: [], applied: false
      };
    }
  }

  await Attempt.create({
    userId: user.userId, exerciseId: exercise.id, lessonId, correct, responseMs: ms,
    timestamp: at, clientId: input.clientId
  });

  const xpAwarded = xpForAttempt(correct, ms);
  user.totalXp += xpAwarded;

  // Streaks only move forward in time: an offline answer older than the last
  // recorded activity must never reset or double-count the streak.
  const last: Date | null = user.lastActiveDate ?? null;
  if (!last || at.getTime() >= last.getTime()) {
    const streak = updateStreak(last, at, { streakCount: user.streakCount, streakFreezes: user.streakFreezes });
    user.streakCount = streak.streakCount;
    user.streakFreezes = streak.streakFreezes;
    user.lastActiveDate = at;
  }
  user.level = levelForXp(user.totalXp);

  if (exercise.wordId) {
    const prev = await Review.findOne({ userId: user.userId, wordId: exercise.wordId });
    const next = sm2(
      { easiness: prev?.easiness ?? 2.5, intervalDays: prev?.intervalDays ?? 0, repetitions: prev?.repetitions ?? 0 },
      qualityFromAttempt(correct, ms),
      at
    );
    await Review.findOneAndUpdate(
      { userId: user.userId, wordId: exercise.wordId },
      { userId: user.userId, wordId: exercise.wordId, ...next },
      { upsert: true }
    );
  }

  const unlocked = newlyUnlockedAchievements({
    totalXp: user.totalXp, streakCount: user.streakCount, level: user.level, owned: user.achievements
  });
  if (unlocked.length) user.achievements.push(...unlocked);

  await user.save();

  await LeagueEntry.findOneAndUpdate(
    { weekKey: weekKey(at), userId: user.userId },
    { $set: { displayName: user.displayName }, $inc: { xp: xpAwarded } },
    { upsert: true }
  );

  return {
    correct, correctAnswer: exercise.answer, xpAwarded, totalXp: user.totalXp, level: user.level,
    streakCount: user.streakCount, streakFreezes: user.streakFreezes, newAchievements: unlocked, applied: true
  };
}
