/** GET /me and PUT /me/settings (design doc endpoints; FR-3). */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ensureUser } from '../services/userService';
import { HttpError } from '../utils/httpError';

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

const MAX_DEVICES = 5;

/** Register this device's FCM token so the API can push reminders to it (FR-10). */
router.put('/device-token', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const token = String(req.body?.token || '').trim();
  if (token.length < 20 || token.length > 4096) throw new HttpError(400, 'A valid FCM token is required.');
  const user = await ensureUser(req.userId!, req.userName, req.userEmail);
  const others = user.fcmTokens.filter((t) => t !== token);
  user.fcmTokens = [...others, token].slice(-MAX_DEVICES); // newest devices win
  await user.save();
  res.json({ ok: true, devices: user.fcmTokens.length });
}));

/** Forget this device's token (sign-out). */
router.delete('/device-token', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const token = String(req.body?.token || '').trim();
  const user = await ensureUser(req.userId!, req.userName, req.userEmail);
  user.fcmTokens = user.fcmTokens.filter((t) => t !== token);
  await user.save();
  res.json({ ok: true, devices: user.fcmTokens.length });
}));

export default router;
