/**
 * Hourly streak-reminder job (FR-10). Pushes a "keep your streak" nudge — with the
 * word of the day — to learners who opted in and have not practised yet today.
 * Opt-in via REMINDERS_ENABLED=true so local/demo runs never send anything.
 */
import { User } from '../models/User';
import { WordOfDay } from '../models/WordOfDay';
import { buildStreakReminder, sendPush, shouldRemind } from './notifications';

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function runReminderPass(now = new Date()): Promise<{ checked: number; reminded: number }> {
  const users = await User.find({ 'settings.notifications': { $ne: false }, 'fcmTokens.0': { $exists: true } });
  const wotd = await WordOfDay.findOne({ lang: 'zu' }).sort({ dateKey: -1 });
  let reminded = 0;
  for (const user of users) {
    if (!shouldRemind(user as any, now)) continue;
    const payload = buildStreakReminder(user.settings?.uiLanguage, user.streakCount, wotd);
    const result = await sendPush(user.fcmTokens, payload);
    if (result.invalidTokens.length) user.fcmTokens = user.fcmTokens.filter((t) => !result.invalidTokens.includes(t));
    if (result.sent > 0) { user.lastReminderDate = dayKey(now); reminded++; }
    await user.save();
  }
  console.log(`[reminders] checked ${users.length}, reminded ${reminded}`);
  return { checked: users.length, reminded };
}

export function startReminderScheduler(everyMs = 60 * 60 * 1000): NodeJS.Timeout {
  console.log('[reminders] scheduler on (hourly)');
  return setInterval(() => runReminderPass().catch((e) => console.error('[reminders] failed', e)), everyMs);
}
