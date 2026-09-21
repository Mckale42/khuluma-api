/** AI endpoints (FR-8) — Buddy chat, mistake explanation, free-text grading. */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ensureUser } from '../services/userService';
import { aiChat, aiExplain, aiCheckAnswer } from '../services/gemini';
import { HttpError } from '../utils/httpError';

const router = Router();

router.post('/chat', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const { message } = req.body || {};
  if (!message) throw new HttpError(400, 'message is required.');
  const user = await ensureUser(req.userId!, req.userName, req.userEmail);
  res.json({ reply: await aiChat(String(message), user.level) });
}));

router.post('/explain', requireAuth, asyncHandler(async (req, res) => {
  const { prompt, userAnswer, correctAnswer } = req.body || {};
  if (!prompt || !correctAnswer) throw new HttpError(400, 'prompt and correctAnswer are required.');
  res.json({ explanation: await aiExplain(String(prompt), String(userAnswer || ''), String(correctAnswer)) });
}));

router.post('/check-answer', requireAuth, asyncHandler(async (req, res) => {
  const { prompt, expected, userAnswer } = req.body || {};
  if (!prompt || !expected) throw new HttpError(400, 'prompt and expected are required.');
  res.json(await aiCheckAnswer(String(prompt), String(expected), String(userAnswer || '')));
}));

export default router;
