/** MongoDB connection — real Atlas cluster, or an in-memory server in demo mode. */
import mongoose from 'mongoose';
import { env } from './env';

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);

  if (env.demoMode) {
    // No MONGODB_URI: spin up a throwaway in-memory MongoDB so the API runs
    // with zero external setup. Data resets on restart.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri(), { dbName: 'khuluma' });
    console.log('[db] DEMO MODE — in-memory MongoDB started');
    const { seedDatabase } = await import('../scripts/seed');
    await seedDatabase();
    return;
  }

  await mongoose.connect(env.mongoUri, { dbName: 'khuluma' });
  console.log('[db] connected to MongoDB Atlas');

  await ensureSeedContent();
}

/**
 * Keep the course content current without touching learner data. Seeds the starter isiZulu course when the
 * database is empty, and re-seeds it once when the database still has the older (pre-Final-POE) content that
 * lacks the "Listen & Speak" lesson. seedDatabase() only replaces courses, lessons, words of the day and the
 * achievement catalogue, so users, attempts, reviews and league entries are never overwritten.
 */
export async function ensureSeedContent(): Promise<'seeded' | 'upgraded' | 'current'> {
  const { Course } = await import('../models/Course');
  const { Lesson } = await import('../models/Lesson');
  const { seedDatabase } = await import('../scripts/seed');
  if ((await Course.estimatedDocumentCount()) === 0) {
    console.log('[db] empty — seeding starter content');
    await seedDatabase();
    return 'seeded';
  }
  if (!(await Lesson.exists({ lessonId: 'l4' }))) {
    console.log('[db] older course content found — upgrading to the Final POE content (user data is kept)');
    await seedDatabase();
    return 'upgraded';
  }
  return 'current';
}
