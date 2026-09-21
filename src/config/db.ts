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

  // First-run seeding: if the Atlas database has no course content yet, load the
  // starter isiZulu course, word-of-day and achievements. Idempotent — it only
  // runs while the collection is empty, so real user data is never overwritten.
  const { Course } = await import('../models/Course');
  const courseCount = await Course.estimatedDocumentCount();
  if (courseCount === 0) {
    console.log('[db] Atlas empty — seeding starter content');
    const { seedDatabase } = await import('../scripts/seed');
    await seedDatabase();
  }
}
