/**
 * POST /attempts — the core business-logic endpoint (design doc §5.1).
 * On every submitted answer the API: validates, decides correctness, awards XP,
 * updates streak + level, schedules the next spaced-repetition review, unlocks
 * achievements and updates the weekly league. None of this lives on the phone.
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ensureUser } from '../services/userService';
import { Lesson } from '../models/Lesson';
import { Attempt } from '../models/Attempt';
import { Review } from '../models/Review';
import { LeagueEntry } from '../models/LeagueEntry';
import { HttpError } from '../utils/httpError';
import { xpForAttempt, levelForXp, updateStreak, newlyUnlockedAchievements } from '../services/gamification';
import { sm2, qualityFromAttempt } from '../services/spacedRepetition';
import { weekKey } from '../utils/dates';

const router = Router();

const normalise = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();

router.post('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { exerciseId, lessonId, answer, responseMs } = req.body || {};
  if (!exerciseId || !lessonId) throw new HttpError(400, 'exerciseId and lessonId are required.');

  const lesson = await Lesson.findOne({ lessonId });
  if (!lesson) throw new HttpError(404, 'Lesson not found.');
  const exercise = lesson.exercises.find((e) => e.id === exerciseId);
  if (!exercise) throw new HttpError(404, 'Exercise not found.');

  const correct = normalise(String(answer)) === normalise(exercise.answer);
  const ms = Number(responseMs) || 0;
  const now = new Date();

  const user = await ensureUser(req.userId!, req.userName, req.userEmail);

  // Record the raw attempt (feeds adaptive difficulty on GET /lessons/:id/next).
  await Attempt.create({ userId: user.userId, exerciseId, lessonId, correct, responseMs: ms });

  // XP + streak + level.
  const xpAwarded = xpForAttempt(correct, ms);
  user.totalXp += xpAwarded;
  const streak = updateStreak(user.lastActiveDate ?? null, now, {
    streakCount: user.streakCount,
    streakFreezes: user.streakFreezes
  });
  user.streakCount = streak.streakCount;
  user.streakFreezes = streak.streakFreezes;
  user.lastActiveDate = now;
  user.level = levelForXp(user.totalXp);

  // Spaced repetition — schedule the next review of this word (FR-6).
  if (exercise.wordId) {
    const prev = await Review.findOne({ userId: user.userId, wordId: exercise.wordId });
    const q = qualityFromAttempt(correct, ms);
    const next = sm2(
      { easiness: prev?.easiness ?? 2.5, intervalDays: prev?.intervalDays ?? 0, repetitions: prev?.repetitions ?? 0 },
      q,
      now
    );
    await Review.findOneAndUpdate(
      { userId: user.userId, wordId: exercise.wordId },
      { userId: user.userId, wordId: exercise.wordId, ...next },
      { upsert: true }
    );
  }

  // Achievements.
  const unlocked = newlyUnlockedAchievements({
    totalXp: user.totalXp,
    streakCount: user.streakCount,
    level: user.level,
    owned: user.achievements
  });
  if (unlocked.length) user.achievements.push(...unlocked);

  await user.save();

  // Weekly league (increment this week's XP bucket).
  await LeagueEntry.findOneAndUpdate(
    { weekKey: weekKey(now), userId: user.userId },
    { $set: { displayName: user.displayName }, $inc: { xp: xpAwarded } },
    { upsert: true }
  );

  res.json({
    correct,
    correctAnswer: exercise.answer, // revealed after submission so the app can show it / feed the AI coach
    xpAwarded,
    totalXp: user.totalXp,
    level: user.level,
    streakCount: user.streakCount,
    streakFreezes: user.streakFreezes,
    newAchievements: unlocked
  });
}));

export default router;
