import { normalise, isCorrect } from '../src/services/grading';

describe('normalise', () => {
  it('lower-cases and trims', () => expect(normalise('  Sawubona ')).toBe('sawubona'));
  it('strips punctuation', () => expect(normalise('Thank you!')).toBe('thank you'));
  it('collapses repeated whitespace', () => expect(normalise('thank    you')).toBe('thank you'));
  it('handles null-ish input', () => expect(normalise(undefined as unknown as string)).toBe(''));
});

describe('isCorrect', () => {
  it('accepts case/punctuation differences', () => expect(isCorrect('Thank You.', 'thank you')).toBe(true));
  it('rejects a different answer', () => expect(isCorrect('goodbye', 'thank you')).toBe(false));
  it('rejects an empty answer', () => expect(isCorrect('', 'yes')).toBe(false));
});
