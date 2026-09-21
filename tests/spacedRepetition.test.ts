import { sm2, qualityFromAttempt } from '../src/services/spacedRepetition';

describe('qualityFromAttempt', () => {
  it('rewards fast correct answers with the highest quality', () => {
    expect(qualityFromAttempt(true, 1500)).toBe(5);
  });
  it('treats a wrong answer as a lapse', () => {
    expect(qualityFromAttempt(false, 1000)).toBe(2);
  });
});

describe('sm2', () => {
  const start = { easiness: 2.5, intervalDays: 0, repetitions: 0 };

  it('schedules the first correct review one day out', () => {
    const r = sm2(start, 5);
    expect(r.repetitions).toBe(1);
    expect(r.intervalDays).toBe(1);
  });

  it('sets the second correct interval to six days', () => {
    const r = sm2({ easiness: 2.5, intervalDays: 1, repetitions: 1 }, 4);
    expect(r.repetitions).toBe(2);
    expect(r.intervalDays).toBe(6);
  });

  it('grows the interval by the easiness factor thereafter', () => {
    const r = sm2({ easiness: 2.5, intervalDays: 6, repetitions: 2 }, 5);
    expect(r.intervalDays).toBe(15); // round(6 * 2.5)
  });

  it('resets repetitions and reviews tomorrow on a failed recall', () => {
    const r = sm2({ easiness: 2.5, intervalDays: 15, repetitions: 5 }, 1);
    expect(r.repetitions).toBe(0);
    expect(r.intervalDays).toBe(1);
  });

  it('never lets easiness fall below 1.3', () => {
    let s = { easiness: 1.3, intervalDays: 1, repetitions: 1 };
    for (let i = 0; i < 5; i++) s = sm2(s, 0);
    expect(s.easiness).toBeGreaterThanOrEqual(1.3);
  });
});
