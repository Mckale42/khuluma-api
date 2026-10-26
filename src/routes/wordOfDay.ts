/** GET /word-of-day — daily vocabulary with a cultural note (design doc §2.2). */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { WordOfDay } from '../models/WordOfDay';
import { dateKey, wordIndexForDay } from '../utils/dates';
import { resolveAudioUrl } from '../services/audioStorage';

const router = Router();

async function pickFromPool(lang: string) {
  const pool = await WordOfDay.find({ lang }).sort({ word: 1 });
  return pool.length ? pool[wordIndexForDay(new Date(), pool.length)] : null;
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'zu';
  // A word dated today wins; otherwise rotate through the pool by day of the year.
  const word =
    (await WordOfDay.findOne({ dateKey: dateKey(), lang })) ||
    (await pickFromPool(lang));
  if (!word) return res.json({ word: null });
  res.json({ word: word.word, translation: word.translation, note: word.note, audioUrl: await resolveAudioUrl(word.audioUrl) });
}));

export default router;
