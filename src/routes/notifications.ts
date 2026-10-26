/** POST /notifications/test — push a test message to the caller's own devices (FR-10 demo + diagnostics). */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ensureUser } from '../services/userService';
import { buildTestNotification, sendPush } from '../services/notifications';

const router = Router();

router.post('/test', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const user = await ensureUser(req.userId!, req.userName, req.userEmail);
  const result = await sendPush(user.fcmTokens, buildTestNotification(user.settings?.uiLanguage));
  if (result.invalidTokens.length) {
    user.fcmTokens = user.fcmTokens.filter((t) => !result.invalidTokens.includes(t));
    await user.save();
  }
  res.json(result);
}));

export default router;
