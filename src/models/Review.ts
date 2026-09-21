/** Spaced-repetition review record (design doc §7.3) — SM-2 fields. */
import { Schema, model, InferSchemaType } from 'mongoose';

const reviewSchema = new Schema({
  userId: { type: String, required: true, index: true },
  wordId: { type: String, required: true },
  easiness: { type: Number, default: 2.5 },     // SM-2 easiness factor
  intervalDays: { type: Number, default: 0 },
  repetitions: { type: Number, default: 0 },
  dueDate: { type: Date, default: Date.now }
});
reviewSchema.index({ userId: 1, wordId: 1 }, { unique: true });

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export const Review = model('Review', reviewSchema);
