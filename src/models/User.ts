/**
 * User & progress document (design doc §7.1).
 * One document per learner, keyed by the Firebase uid. Holds settings plus all
 * gamification state (XP, streak, level) so the API is the single source of truth.
 */
import { Schema, model, InferSchemaType } from 'mongoose';

const settingsSchema = new Schema(
  {
    dailyGoalXp: { type: Number, default: 50 },       // FR-3 daily goal
    uiLanguage: { type: String, default: 'en' },       // 'en' | 'zu' (FR-11, POE)
    notifications: { type: Boolean, default: true },
    sound: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false },
    biometricEnabled: { type: Boolean, default: false } // FR-2 (POE)
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true }, // Firebase uid
    displayName: { type: String, default: 'Learner' },
    email: { type: String, default: '' },
    learningLanguage: { type: String, default: 'zu' }, // isiZulu
    totalXp: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    streakFreezes: { type: Number, default: 1 },
    level: { type: Number, default: 1 },
    lastActiveDate: { type: Date, default: null },
    achievements: { type: [String], default: [] },     // unlocked achievement codes
    settings: { type: settingsSchema, default: () => ({}) }
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);
