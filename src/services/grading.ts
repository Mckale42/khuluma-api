/**
 * Answer grading — shared by the online (POST /attempts) and offline-sync
 * (POST /sync) paths so a queued offline answer is judged exactly like a live one.
 */

/** Lower-case, strip punctuation and collapse whitespace so "Thank you!" == "thank you". */
export const normalise = (s: string): string =>
  (s ?? '').toString().toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();

export const isCorrect = (answer: unknown, expected: string): boolean =>
  normalise(String(answer ?? '')) === normalise(expected);
