/** A single exercise attempt (design doc §7.3). Feeds XP + adaptive difficulty. */
import { Schema, model, InferSchemaType } from 'mongoose';

const attemptSchema = new Schema({
  userId: { type: String, required: true, index: true },
  exerciseId: { type: String, required: true },
  lessonId: { type: String, default: '' },
  correct: { type: Boolean, required: true },
  responseMs: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

export type AttemptDoc = InferSchemaType<typeof attemptSchema>;
export const Attempt = model('Attempt', attemptSchema);
