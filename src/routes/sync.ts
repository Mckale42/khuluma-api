/**
 * POST /sync — apply a batch of actions performed offline (FR-9, POE-facing).
 * The prototype accepts queued attempts with client timestamps and replays them
 * through the same logic used online, so offline progress reconciles on reconnect.
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ensureUser } from '../services/userService';
import { Lesson } from '../models/Lesson';
import { Attempt } from '../models/Attempt';
import { xpForAttempt, levelForXp } from '../services/gamification';

const router = Router();
const normalise = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim();

router.post('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const items: any[] = Array.isArray(req.body?.items) ? req.body.items : [];
  const user = await ensureUser(req.userId!, req.userName, req.userEmail);
  let applied = 0;
  let xpGained = 0;

  for (const item of items) {
    const lesson = await Lesson.findOne({ lessonId: item.lessonId });
    const exercise = lesson?.exercises.find((e) => e.id === item.exerciseId);
    if (!exercise) continue;
    const correct = normalise(String(item.answer)) === normalise(exercise.answer);
    const ts = item.timestamp ? new Date(item.timestamp) : new Date();
    await Attempt.create({ userId: user.userId, exerciseId: item.exerciseId, lessonId: item.lessonId, correct, responseMs: item.responseMs || 0, timestamp: ts });
    const xp = xpForAttempt(correct, item.responseMs || 0);
    xpGained += xp;
    applied++;
  }

  user.totalXp += xpGained;
  user.level = levelForXp(user.totalXp);
  await user.save();
  res.json({ applied, xpGained, totalXp: user.totalXp, level: user.level });
}));

export default router;
