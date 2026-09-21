/** GET /review/due — vocabulary due for spaced-repetition review (FR-6). */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { Review } from '../models/Review';

const router = Router();

router.get('/due', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const due = await Review.find({ userId: req.userId, dueDate: { $lte: new Date() } })
    .sort({ dueDate: 1 })
    .limit(20);
  res.json({ count: due.length, items: due.map((r) => ({ wordId: r.wordId, dueDate: r.dueDate, intervalDays: r.intervalDays })) });
}));

export default router;
