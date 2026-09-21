/**
 * Seed the database with the isiZulu starter course, word of the day and the
 * achievement catalogue. Exposed as seedDatabase() so demo mode can auto-seed,
 * and runnable directly with:  npm run seed
 */
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { Course } from '../models/Course';
import { Lesson } from '../models/Lesson';
import { WordOfDay } from '../models/WordOfDay';
import { Achievement } from '../models/Achievement';
import { dateKey } from '../utils/dates';

export async function seedDatabase(): Promise<void> {
  await Promise.all([Course.deleteMany({}), Lesson.deleteMany({}), WordOfDay.deleteMany({}), Achievement.deleteMany({})]);

  await Course.create({
    lang: 'zu', title: 'isiZulu', comingSoon: false,
    units: [
      { unitId: 'u1', title: 'Greetings', orderIndex: 0 },
      { unitId: 'u2', title: 'Everyday Basics', orderIndex: 1 }
    ]
  });
  await Course.create({ lang: 'xh', title: 'isiXhosa', comingSoon: true, units: [] });
  await Course.create({ lang: 'st', title: 'Sesotho', comingSoon: true, units: [] });

  await Lesson.create([
    {
      lessonId: 'l1', courseLang: 'zu', unitId: 'u1', title: 'Saying hello', orderIndex: 0, xpReward: 20,
      exercises: [
        { id: 'l1e1', type: 'mcq', prompt: 'How do you greet ONE person in isiZulu?', options: ['Sawubona', 'Sanibonani', 'Hamba', 'Cha'], answer: 'Sawubona', wordId: 'w_sawubona' },
        { id: 'l1e2', type: 'mcq', prompt: 'What does "Unjani?" mean?', options: ['Goodbye', 'How are you?', 'Thank you', 'Yes'], answer: 'How are you?', wordId: 'w_unjani' },
        { id: 'l1e3', type: 'match', prompt: 'Match: "Ngiyaphila" means…', options: ['I am well', 'Good night', 'Please', 'No'], answer: 'I am well', wordId: 'w_ngiyaphila' },
        { id: 'l1e4', type: 'freetext', prompt: 'Translate to English: "Ngiyabonga"', options: [], answer: 'thank you', wordId: 'w_ngiyabonga' }
      ]
    },
    {
      lessonId: 'l2', courseLang: 'zu', unitId: 'u1', title: 'Goodbyes', orderIndex: 1, xpReward: 20,
      exercises: [
        { id: 'l2e1', type: 'mcq', prompt: 'Say goodbye to someone LEAVING:', options: ['Hamba kahle', 'Sala kahle', 'Sawubona', 'Yebo'], answer: 'Hamba kahle', wordId: 'w_hambakahle' },
        { id: 'l2e2', type: 'mcq', prompt: 'Say goodbye to someone STAYING:', options: ['Sala kahle', 'Hamba kahle', 'Unjani', 'Cha'], answer: 'Sala kahle', wordId: 'w_salakahle' },
        { id: 'l2e3', type: 'freetext', prompt: 'Translate: "Yebo"', options: [], answer: 'yes', wordId: 'w_yebo' }
      ]
    },
    {
      lessonId: 'l3', courseLang: 'zu', unitId: 'u2', title: 'People & things', orderIndex: 0, xpReward: 20,
      exercises: [
        { id: 'l3e1', type: 'mcq', prompt: '"Umama" means…', options: ['Mother', 'Father', 'Water', 'Food'], answer: 'Mother', wordId: 'w_umama' },
        { id: 'l3e2', type: 'mcq', prompt: '"Ubaba" means…', options: ['Father', 'Brother', 'Friend', 'Teacher'], answer: 'Father', wordId: 'w_ubaba' },
        { id: 'l3e3', type: 'match', prompt: '"Amanzi" means…', options: ['Water', 'Food', 'House', 'Money'], answer: 'Water', wordId: 'w_amanzi' },
        { id: 'l3e4', type: 'freetext', prompt: 'Translate to English: "Ukudla"', options: [], answer: 'food', wordId: 'w_ukudla' }
      ]
    }
  ]);

  await WordOfDay.create({
    dateKey: dateKey(), lang: 'zu',
    word: 'Ubuntu', translation: 'humanity / I am because we are',
    note: 'Ubuntu is a Nguni concept meaning a person is a person through other people — a cornerstone of South African culture.',
    audioUrl: ''
  });

  await Achievement.create([
    { code: 'first_xp', title: 'First Steps', description: 'Earned your first XP.', icon: '🌱' },
    { code: 'streak_3', title: 'On a Roll', description: 'Reached a 3-day streak.', icon: '🔥' },
    { code: 'streak_7', title: 'Week Warrior', description: 'Reached a 7-day streak.', icon: '📅' },
    { code: 'level_5', title: 'Rising Star', description: 'Reached level 5.', icon: '⭐' },
    { code: 'xp_1000', title: 'Fluent Grind', description: 'Earned 1000 XP.', icon: '🏆' }
  ]);

  console.log('[seed] done: 3 courses, 3 lessons, word-of-day, 5 achievements');
}

// CLI entry point.
if (require.main === module) {
  connectDb()
    .then(seedDatabase)
    .then(() => mongoose.disconnect())
    .catch((e) => { console.error('[seed] failed', e); process.exit(1); });
}
