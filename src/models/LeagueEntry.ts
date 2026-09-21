/** Weekly XP league entry (design doc §2.2, GET /leaderboard). */
import { Schema, model, InferSchemaType } from 'mongoose';

const leagueEntrySchema = new Schema({
  weekKey: { type: String, required: true, index: true }, // e.g. 2026-W38
  userId: { type: String, required: true },
  displayName: { type: String, default: 'Learner' },
  xp: { type: Number, default: 0 }
});
leagueEntrySchema.index({ weekKey: 1, userId: 1 }, { unique: true });

export type LeagueEntryDoc = InferSchemaType<typeof leagueEntrySchema>;
export const LeagueEntry = model('LeagueEntry', leagueEntrySchema);
