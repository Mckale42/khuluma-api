/** Achievement catalogue (design doc §2.2). User-unlocked codes live on the User. */
import { Schema, model, InferSchemaType } from 'mongoose';

const achievementSchema = new Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '' }
});

export type AchievementDoc = InferSchemaType<typeof achievementSchema>;
export const Achievement = model('Achievement', achievementSchema);
