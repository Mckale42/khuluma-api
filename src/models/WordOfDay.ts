/** Daily vocabulary item with a cultural note (design doc §2.2, GET /word-of-day). */
import { Schema, model, InferSchemaType } from 'mongoose';

const wordOfDaySchema = new Schema({
  dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD
  lang: { type: String, required: true },
  word: { type: String, required: true },
  translation: { type: String, required: true },
  note: { type: String, default: '' },
  audioUrl: { type: String, default: '' }
});
wordOfDaySchema.index({ dateKey: 1, lang: 1 }, { unique: true });

export type WordOfDayDoc = InferSchemaType<typeof wordOfDaySchema>;
export const WordOfDay = model('WordOfDay', wordOfDaySchema);
