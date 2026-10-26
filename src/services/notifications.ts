/**
 * Push notifications via Firebase Cloud Messaging (FR-10).
 * Message wording and the "should we nudge this learner?" rule are PURE functions
 * (unit-tested); the actual send goes through an injectable messaging client so
 * tests never touch the network.
 */
import { getFirebaseAdmin } from '../config/firebase';

export type Lang = 'en' | 'zu' | 'af';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** The minimal slice of firebase-admin's Messaging that we use. */
export interface MessagingLike {
  sendEachForMulticast(msg: {
    tokens: string[];
    notification: { title: string; body: string };
    data?: Record<string, string>;
    android?: object;
  }): Promise<{ successCount: number; failureCount: number; responses: { success: boolean; error?: { code?: string } }[] }>;
}

const COPY: Record<Lang, { streakTitle: string; streakBody: (n: number) => string; wordTitle: string; testTitle: string; testBody: string }> = {
  en: {
    streakTitle: 'Keep your streak alive 🔥',
    streakBody: (n) => (n > 0 ? `You're on a ${n}-day streak. A 2-minute lesson keeps it going!` : 'A 2-minute lesson today starts a new streak!'),
    wordTitle: 'Word of the day',
    testTitle: 'Khuluma notifications are on',
    testBody: 'You will get streak reminders and the word of the day.'
  },
  zu: {
    streakTitle: 'Gcina uchungechunge lwakho 🔥',
    streakBody: (n) => (n > 0 ? `Ungosuku lwe-${n} ulandelanisa. Isifundo semizuzu emi-2 siyaluqhubeka!` : 'Isifundo semizuzu emi-2 namuhla siqala uchungechunge olusha!'),
    wordTitle: 'Igama losuku',
    testTitle: 'Izaziso ze-Khuluma ziyasebenza',
    testBody: 'Uzothola izikhumbuzo zochungechunge negama losuku.'
  },
  af: {
    streakTitle: 'Hou jou reeks aan die gang 🔥',
    streakBody: (n) => (n > 0 ? `Jy is op ’n ${n}-dag reeks. ’n Les van 2 minute hou dit aan die gang!` : '’n Les van 2 minute vandag begin ’n nuwe reeks!'),
    wordTitle: 'Woord van die dag',
    testTitle: 'Khuluma-kennisgewings is aan',
    testBody: 'Jy sal reeks-herinneringe en die woord van die dag kry.'
  }
};

export const asLang = (l?: string): Lang => (l === 'zu' || l === 'af' ? l : 'en');

/** Streak reminder in the learner's chosen UI language; optionally teases today's word. */
export function buildStreakReminder(lang: string | undefined, streak: number, word?: { word: string; translation: string } | null): PushPayload {
  const c = COPY[asLang(lang)];
  const wordLine = word ? ` ${c.wordTitle}: ${word.word} — ${word.translation}.` : '';
  return { title: c.streakTitle, body: c.streakBody(streak) + wordLine, data: { type: 'streak_reminder' } };
}

export function buildTestNotification(lang: string | undefined): PushPayload {
  const c = COPY[asLang(lang)];
  return { title: c.testTitle, body: c.testBody, data: { type: 'test' } };
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Nudge only learners who opted in, have a device registered, have not practised
 * today and have not already been nudged today (at most one reminder a day).
 */
export function shouldRemind(
  user: { settings?: { notifications?: boolean }; fcmTokens?: string[]; lastActiveDate?: Date | null; lastReminderDate?: string | null },
  now: Date
): boolean {
  if (user.settings?.notifications === false) return false;
  if (!user.fcmTokens || user.fcmTokens.length === 0) return false;
  if (user.lastReminderDate === dayKey(now)) return false;
  if (user.lastActiveDate && dayKey(user.lastActiveDate) === dayKey(now)) return false;
  return true;
}

export interface SendResult { sent: number; failed: number; invalidTokens: string[]; skipped?: string }

const DEAD = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);

/** Send to every token; report the ones FCM says are dead so the caller can prune them. */
export async function sendPush(tokens: string[], payload: PushPayload, messaging?: MessagingLike | null): Promise<SendResult> {
  if (tokens.length === 0) return { sent: 0, failed: 0, invalidTokens: [], skipped: 'no device tokens' };
  const client = messaging ?? (getFirebaseAdmin()?.messaging() as unknown as MessagingLike | undefined);
  if (!client) return { sent: 0, failed: 0, invalidTokens: [], skipped: 'firebase not configured (dev mode)' };

  const res = await client.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
    android: { priority: 'high', notification: { channelId: 'khuluma_reminders' } }
  });
  const invalidTokens = res.responses
    .map((r, i) => (!r.success && r.error?.code && DEAD.has(r.error.code) ? tokens[i] : null))
    .filter((t): t is string => t !== null);
  return { sent: res.successCount, failed: res.failureCount, invalidTokens };
}
