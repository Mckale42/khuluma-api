import { dateKey, weekKey, wordIndexForDay } from '../src/utils/dates';

describe('wordIndexForDay', () => {
  it('stays within the pool', () => {
    for (let d = 0; d < 400; d++) {
      const i = wordIndexForDay(new Date(Date.UTC(2026, 0, 1 + d)), 10);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(10);
    }
  });
  it('is stable within a day', () => {
    expect(wordIndexForDay(new Date('2026-10-23T01:00:00Z'), 10)).toBe(wordIndexForDay(new Date('2026-10-23T23:00:00Z'), 10));
  });
  it('moves to the next word tomorrow', () => {
    const a = wordIndexForDay(new Date('2026-10-23T12:00:00Z'), 10);
    const b = wordIndexForDay(new Date('2026-10-24T12:00:00Z'), 10);
    expect(b).toBe((a + 1) % 10);
  });
  it('handles an empty pool', () => expect(wordIndexForDay(new Date(), 0)).toBe(0));
});

describe('dateKey / weekKey', () => {
  it('formats the UTC date', () => expect(dateKey(new Date('2026-10-23T22:30:00Z'))).toBe('2026-10-23'));
  it('buckets a date into an ISO week', () => expect(weekKey(new Date('2026-10-23T12:00:00Z'))).toBe('2026-W43'));
});
