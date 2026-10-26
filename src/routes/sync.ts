/**
 * POST /sync — apply a batch of answers the learner gave while offline (FR-9).
 * Each item carries a client-generated id and the time it was answered. Items are
 * replayed oldest-first through the same logic as live answers, and the batch is
 * idempotent: re-sending an id that was already applied is acknowledged but earns
 * nothing, so a retry after a dropped connection can never double-count XP.
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ensureUser } from '../services/userService';
import { Lesson } from '../models/Lesson';
import { processAttempt } from '../services/attemptProcessor';
import { HttpError } from '../utils/httpError';

const router = Router();
const MAX_BATCH = 200;

router.post('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const items: any[] = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length > MAX_BATCH) throw new HttpError(400, `At most ${MAX_BATCH} items per sync.`);

  const user = await ensureUser(req.userId!, req.userName, req.userEmail);
  const ordered = [...items].sort((a, b) => Date.parse(a.timestamp || 0) - Date.parse(b.timestamp || 0));

  let applied = 0;
  let duplicates = 0;
  let xpGained = 0;
  const rejected: string[] = [];
  const syncedIds: string[] = [];

  for (const item of ordered) {
    const lesson = await Lesson.findOne({ lessonId: item.lessonId });
    const exercise = lesson?.exercises.find((e) => e.id === item.exerciseId);
    if (!lesson || !exercise) { if (item.clientId) rejected.push(String(item.clientId)); continue; }

    const when = item.timestamp ? new Date(item.timestamp) : new Date();
    // Never trust a client clock into the future (would corrupt streaks / league weeks).
    const at = Number.isNaN(when.getTime()) || when.getTime() > Date.now() ? new Date() : when;

    const out = await processAttempt(user, {
      exercise, lessonId: item.lessonId, answer: item.answer,
      responseMs: Number(item.responseMs) || 0, at, clientId: item.clientId ? String(item.clientId) : undefined
    });
    if (out.applied) { applied++; xpGained += out.xpAwarded; } else { duplicates++; }
    if (item.clientId) syncedIds.push(String(item.clientId));
  }

  res.json({
    applied, duplicates, rejected, syncedIds, xpGained,
    totalXp: user.totalXp, level: user.level, streakCount: user.streakCount
  });
}));

export default router;
