/**
 * Centralised, validated environment configuration.
 * DEMO MODE: if MONGODB_URI is not set, the API runs fully self-contained —
 * an in-memory MongoDB is started and seeded, and auth is bypassed — so the
 * team can run and test the app with a single command and no cloud accounts.
 */
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGODB_URI || '';
const demoMode = mongoUri === '';

export const env = {
  port: parseInt(process.env.PORT || '8080', 10),
  mongoUri,
  demoMode,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  // Auth is bypassed in demo mode, or when AUTH_DEV_BYPASS=true.
  authDevBypass: demoMode || (process.env.AUTH_DEV_BYPASS || 'false').toLowerCase() === 'true'
};
