/** GET /word-of-day — daily vocabulary with a cultural note (design doc §2.2). */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { WordOfDay } from '../models/WordOfDay';
import { dateKey } from '../utils/dates';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'zu';
  // Prefer today's word; otherwise fall back to the most recent one seeded.
  const word =
    (await WordOfDay.findOne({ dateKey: dateKey(), lang })) ||
    (await WordOfDay.findOne({ lang }).sort({ dateKey: -1 }));
  if (!word) return res.json({ word: null });
  res.json({ word: word.word, translation: word.translation, note: word.note, audioUrl: word.audioUrl });
}));

export default router;
