/** GET /leaderboard — the weekly XP league, ranked (design doc §2.2). */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { LeagueEntry } from '../models/LeagueEntry';
import { weekKey } from '../utils/dates';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (_req, res) => {
  const entries = await LeagueEntry.find({ weekKey: weekKey() }).sort({ xp: -1 }).limit(50);
  res.json({
    weekKey: weekKey(),
    ranking: entries.map((e, i) => ({ rank: i + 1, displayName: e.displayName, xp: e.xp }))
  });
}));

export default router;
