/**
 * Spaced repetition using the SM-2 algorithm (design doc §7.3, FR-6).
 * PURE + unit-tested. Given the previous review state and a recall "quality"
 * (0-5), it returns the next easiness, interval, repetition count and due date.
 * Based on Wozniak & Gorzelanczyk (1994), cited in the design document.
 */

export interface SrsState {
  easiness: number;
  intervalDays: number;
  repetitions: number;
}

export interface SrsResult extends SrsState {
  dueDate: Date;
}

/** Map an attempt to an SM-2 quality score (0-5). Faster correct = higher. */
export function qualityFromAttempt(correct: boolean, responseMs: number): number {
  if (!correct) return 2;                 // lapse -> repetitions reset
  if (responseMs > 0 && responseMs < 3000) return 5;
  if (responseMs > 0 && responseMs < 8000) return 4;
  return 3;
}

export function sm2(prev: SrsState, quality: number, now: Date = new Date()): SrsResult {
  const q = Math.max(0, Math.min(5, quality));
  let { easiness, intervalDays, repetitions } = prev;

  if (q < 3) {
    // Failed recall: restart the repetition schedule, review again tomorrow.
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easiness);
  }

  // Update easiness factor, floored at 1.3 as per SM-2.
  easiness = easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easiness < 1.3) easiness = 1.3;

  const dueDate = new Date(now.getTime() + intervalDays * 86_400_000);
  return { easiness: Number(easiness.toFixed(2)), intervalDays, repetitions, dueDate };
}
