/**
 * Lesson & embedded Exercise documents (design doc §7.2).
 * Exercises are embedded because their fields vary by type — the document model
 * suits this better than rigid relational tables.
 */
import { Schema, model, InferSchemaType } from 'mongoose';

const exerciseSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'listen', 'match', 'freetext'], required: true },
    prompt: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: String, required: true },
    audioUrl: { type: String, default: '' },      // Azure Blob Storage reference
    wordId: { type: String, default: '' }         // links exercise to a vocab item for review
  },
  { _id: false }
);

const lessonSchema = new Schema({
  lessonId: { type: String, required: true, unique: true, index: true },
  courseLang: { type: String, required: true, index: true },
  unitId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  orderIndex: { type: Number, default: 0 },
  xpReward: { type: Number, default: 20 },
  exercises: { type: [exerciseSchema], default: [] }
});

export type ExerciseDoc = InferSchemaType<typeof exerciseSchema>;
export type LessonDoc = InferSchemaType<typeof lessonSchema>;
export const Lesson = model('Lesson', lessonSchema);
