/**
 * Authentication middleware (FR-1 / NR-4).
 * Verifies the Firebase ID token in "Authorization: Bearer <token>" and attaches
 * the user id to the request. Returns 401 when the token is missing or invalid.
 *
 * In dev/test mode (AUTH_DEV_BYPASS=true) it trusts an "x-dev-user" header so the
 * team can run the API and tests without a live Firebase project.
 */
import { Request, Response, NextFunction } from 'express';
import { getFirebaseAdmin } from '../config/firebase';
import { env } from '../config/env';

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (env.authDevBypass) {
      req.userId = (req.header('x-dev-user') || 'dev-user').toString();
      req.userEmail = 'dev@khuluma.app';
      req.userName = 'Dev User';
      return next();
    }

    const header = req.header('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing bearer token.' });

    const admin = getFirebaseAdmin()!;
    const decoded = await admin.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    req.userEmail = decoded.email;
    req.userName = decoded.name || decoded.email || 'Learner';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
