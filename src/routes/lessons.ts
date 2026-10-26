/**
 * GET /lessons/:id/next — adaptive exercise selection (FR-6).
 * Exercises the learner recently got wrong are surfaced first; the rest follow
 * in order. This keeps difficulty tuned to the learner without the phone needing
 * any of the logic.
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { Lesson } from '../models/Lesson';
import { Attempt } from '../models/Attempt';
import { HttpError } from '../utils/httpError';
import { resolveAudioUrl, defaultSigner } from '../services/audioStorage';

const router = Router();

router.get('/:id/next', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const lesson = await Lesson.findOne({ lessonId: req.params.id });
  if (!lesson) throw new HttpError(404, 'Lesson not found.');

  const recent = await Attempt.find({ userId: req.userId, lessonId: lesson.lessonId })
    .sort({ timestamp: -1 })
    .limit(50);
  const wrongIds = new Set(recent.filter((a) => !a.correct).map((a) => a.exerciseId));

  const ordered = [...lesson.exercises].sort((a, b) => {
    const aw = wrongIds.has(a.id) ? 0 : 1;
    const bw = wrongIds.has(b.id) ? 0 : 1;
    return aw - bw;
  });

  // The client is trusted with prompt/options/audio but NOT the answer key.
  const signer = defaultSigner();
  const safe = await Promise.all(ordered.map(async (e) => ({
    id: e.id, type: e.type, prompt: e.prompt, options: e.options, speak: e.speak,
    audioUrl: await resolveAudioUrl(e.audioUrl, signer) // blob path -> short-lived signed URL
  })));
  res.json({ lessonId: lesson.lessonId, title: lesson.title, xpReward: lesson.xpReward, exercises: safe });
}));

/**
 * GET /lessons/:id/pack — the offline pack for a lesson (FR-9). Unlike /next this
 * INCLUDES the answer key, because the phone must be able to mark answers without
 * a connection. The pack is only handed to an authenticated learner who asked to
 * download the lesson; online play still keeps the key on the server.
 */
router.get('/:id/pack', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const lesson = await Lesson.findOne({ lessonId: req.params.id });
  if (!lesson) throw new HttpError(404, 'Lesson not found.');
  const signer = defaultSigner();
  const exercises = await Promise.all(lesson.exercises.map(async (e) => ({
    id: e.id, type: e.type, prompt: e.prompt, options: e.options, speak: e.speak,
    audioUrl: await resolveAudioUrl(e.audioUrl, signer), answer: e.answer
  })));
  res.json({ lessonId: lesson.lessonId, unitId: lesson.unitId, title: lesson.title, xpReward: lesson.xpReward, exercises });
}));

export default router;
