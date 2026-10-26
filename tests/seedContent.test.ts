import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ensureSeedContent } from '../src/config/db';
import { Course } from '../src/models/Course';
import { Lesson } from '../src/models/Lesson';
import { User } from '../src/models/User';

jest.setTimeout(120_000);

describe('ensureSeedContent', () => {
  let mem: MongoMemoryServer;
  beforeAll(async () => { mem = await MongoMemoryServer.create(); await mongoose.connect(mem.getUri(), { dbName: 'khuluma-test' }); });
  afterAll(async () => { await mongoose.disconnect(); await mem.stop(); });

  it('seeds an empty database', async () => {
    expect(await ensureSeedContent()).toBe('seeded');
    expect(await Lesson.exists({ lessonId: 'l4' })).toBeTruthy();
  });

  it('leaves current content alone', async () => expect(await ensureSeedContent()).toBe('current'));

  it('upgrades old content but keeps learners', async () => {
    await User.create({ userId: 'keep-me', displayName: 'Keep Me', totalXp: 123 });
    await Lesson.deleteOne({ lessonId: 'l4' }); // simulate the pre-Final-POE database
    expect(await ensureSeedContent()).toBe('upgraded');
    expect(await Lesson.exists({ lessonId: 'l4' })).toBeTruthy();
    expect((await User.findOne({ userId: 'keep-me' }))?.totalXp).toBe(123);
    expect(await Course.countDocuments()).toBeGreaterThan(0);
  });
});
