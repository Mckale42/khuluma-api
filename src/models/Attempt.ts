/** A single exercise attempt (design doc §7.3). Feeds XP + adaptive difficulty. */
import { Schema, model, InferSchemaType } from 'mongoose';

const attemptSchema = new Schema({
  userId: { type: String, required: true, index: true },
  exerciseId: { type: String, required: true },
  lessonId: { type: String, default: '' },
  correct: { type: Boolean, required: true },
  responseMs: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
  // Idempotency key for attempts queued offline: replaying the same sync batch twice must not double-count XP.
  clientId: { type: String, default: undefined }
});
attemptSchema.index({ userId: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });

export type AttemptDoc = InferSchemaType<typeof attemptSchema>;
export const Attempt = model('Attempt', attemptSchema);
