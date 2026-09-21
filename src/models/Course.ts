/** Course = a language and its ordered units (design doc §7.2). */
import { Schema, model, InferSchemaType } from 'mongoose';

const unitSchema = new Schema(
  {
    unitId: { type: String, required: true },
    title: { type: String, required: true },
    orderIndex: { type: Number, default: 0 }
  },
  { _id: false }
);

const courseSchema = new Schema({
  lang: { type: String, required: true, unique: true, index: true }, // 'zu'
  title: { type: String, required: true },
  comingSoon: { type: Boolean, default: false },
  units: { type: [unitSchema], default: [] }
});

export type CourseDoc = InferSchemaType<typeof courseSchema>;
export const Course = model('Course', courseSchema);
