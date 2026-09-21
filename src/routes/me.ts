/** GET /me and PUT /me/settings (design doc endpoints; FR-3). */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ensureUser } from '../services/userService';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await ensureUser(req.userId!, req.userName, req.userEmail);
  res.json({
    userId: user.userId,
    displayName: user.displayName,
    email: user.email,
    learningLanguage: user.learningLanguage,
    totalXp: user.totalXp,
    streakCount: user.streakCount,
    streakFreezes: user.streakFreezes,
    level: user.level,
    achievements: user.achievements,
    settings: user.settings
  });
}));

router.put('/settings', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await ensureUser(req.userId!, req.userName, req.userEmail);
  const allowed = ['dailyGoalXp', 'uiLanguage', 'notifications', 'sound', 'darkMode', 'biometricEnabled'];
  for (const key of allowed) {
    if (key in (req.body || {})) (user.settings as any)[key] = req.body[key];
  }
  await user.save();
  res.json({ ok: true, settings: user.settings });
}));

export default router;
