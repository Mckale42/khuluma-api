/**
 * POST /attempts — the core business-logic endpoint (design doc §5.1).
 * On every submitted answer the API validates, decides correctness, awards XP,
 * updates streak + level, schedules the next spaced-repetition review, unlocks
 * achievements and updates the weekly league (see services/attemptProcessor).
 * None of this lives on the phone.
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ensureUser } from '../services/userService';
import { Lesson } from '../models/Lesson';
import { HttpError } from '../utils/httpError';
import { processAttempt } from '../services/attemptProcessor';

const router = Router();

router.post('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { exerciseId, lessonId, answer, responseMs } = req.body || {};
  if (!exerciseId || !lessonId) throw new HttpError(400, 'exerciseId and lessonId are required.');

  const lesson = await Lesson.findOne({ lessonId });
  if (!lesson) throw new HttpError(404, 'Lesson not found.');
  const exercise = lesson.exercises.find((e) => e.id === exerciseId);
  if (!exercise) throw new HttpError(404, 'Exercise not found.');

  const user = await ensureUser(req.userId!, req.userName, req.userEmail);
  const { applied: _applied, ...result } = await processAttempt(user, {
    exercise, lessonId, answer, responseMs: Number(responseMs) || 0, at: new Date()
  });
  res.json(result); // correctAnswer is revealed after submission so the app can show it / feed the AI coach
}));

export default router;
