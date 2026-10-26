import { buildStreakReminder, buildTestNotification, shouldRemind, sendPush, asLang, MessagingLike } from '../src/services/notifications';

describe('message copy', () => {
  it('uses the learner language', () => {
    expect(buildStreakReminder('zu', 3).title).toContain('Gcina');
    expect(buildStreakReminder('af', 3).title).toContain('reeks');
    expect(buildStreakReminder('en', 3).title).toContain('streak');
  });
  it('falls back to English for unknown languages', () => expect(asLang('fr')).toBe('en'));
  it('mentions the streak length and the word of the day', () => {
    const m = buildStreakReminder('en', 5, { word: 'Ubuntu', translation: 'humanity' });
    expect(m.body).toContain('5-day');
    expect(m.body).toContain('Ubuntu');
  });
  it('encourages a new streak when there is none', () => expect(buildStreakReminder('en', 0).body).toContain('new streak'));
  it('builds a test notification', () => expect(buildTestNotification('en').data?.type).toBe('test'));
});

describe('shouldRemind', () => {
  const now = new Date('2026-10-23T10:00:00Z');
  const base = { settings: { notifications: true }, fcmTokens: ['t1'], lastActiveDate: new Date('2026-10-22T20:00:00Z'), lastReminderDate: null };
  it('reminds an opted-in learner who has not practised today', () => expect(shouldRemind(base, now)).toBe(true));
  it('skips learners who turned notifications off', () => expect(shouldRemind({ ...base, settings: { notifications: false } }, now)).toBe(false));
  it('skips learners with no device token', () => expect(shouldRemind({ ...base, fcmTokens: [] }, now)).toBe(false));
  it('skips learners who already practised today', () => expect(shouldRemind({ ...base, lastActiveDate: new Date('2026-10-23T08:00:00Z') }, now)).toBe(false));
  it('sends at most one reminder a day', () => expect(shouldRemind({ ...base, lastReminderDate: '2026-10-23' }, now)).toBe(false));
});

describe('sendPush', () => {
  it('skips when there are no tokens', async () => expect((await sendPush([], { title: 'a', body: 'b' })).skipped).toBeDefined());
  it('reports dead tokens for pruning', async () => {
    const fake: MessagingLike = {
      sendEachForMulticast: async () => ({
        successCount: 1, failureCount: 1,
        responses: [{ success: true }, { success: false, error: { code: 'messaging/registration-token-not-registered' } }]
      })
    };
    const r = await sendPush(['good', 'dead'], { title: 'a', body: 'b' }, fake);
    expect(r.sent).toBe(1);
    expect(r.invalidTokens).toEqual(['dead']);
  });
  it('keeps tokens whose failure is transient', async () => {
    const fake: MessagingLike = {
      sendEachForMulticast: async () => ({ successCount: 0, failureCount: 1, responses: [{ success: false, error: { code: 'messaging/internal-error' } }] })
    };
    expect((await sendPush(['t'], { title: 'a', body: 'b' }, fake)).invalidTokens).toEqual([]);
  });
});
