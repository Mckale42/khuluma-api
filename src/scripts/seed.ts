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

export async function seedDatabase(): Promise<void> {
  await Promise.all([Course.deleteMany({}), Lesson.deleteMany({}), WordOfDay.deleteMany({}), Achievement.deleteMany({})]);

  await Course.create({
    lang: 'zu', title: 'isiZulu', comingSoon: false,
    units: [
      { unitId: 'u1', title: 'Greetings', orderIndex: 0 },
      { unitId: 'u2', title: 'Everyday Basics', orderIndex: 1 },
      { unitId: 'u3', title: 'Listen & Speak', orderIndex: 2 }
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
    },
    {
      // Listening practice: the audioUrl is a blob-storage path (upload clips with `npm run upload-audio`);
      // until a recording exists the phone speaks the `speak` word with its text-to-speech voice.
      lessonId: 'l4', courseLang: 'zu', unitId: 'u3', title: 'Hear it, say it', orderIndex: 0, xpReward: 25,
      exercises: [
        { id: 'l4e1', type: 'listen', prompt: 'Listen. What greeting did you hear?', options: ['Hello', 'Thank you', 'Goodbye', 'Yes'], answer: 'Hello', speak: 'Sawubona', audioUrl: 'audio/zu/sawubona.mp3', wordId: 'w_sawubona' },
        { id: 'l4e2', type: 'listen', prompt: 'Listen. What did you hear?', options: ['Thank you', 'Water', 'Mother', 'No'], answer: 'Thank you', speak: 'Ngiyabonga', audioUrl: 'audio/zu/ngiyabonga.mp3', wordId: 'w_ngiyabonga' },
        { id: 'l4e3', type: 'listen', prompt: 'Listen. What does this word mean?', options: ['Water', 'Food', 'House', 'Father'], answer: 'Water', speak: 'Amanzi', audioUrl: 'audio/zu/amanzi.mp3', wordId: 'w_amanzi' },
        { id: 'l4e4', type: 'listen', prompt: 'Listen and type the English meaning.', options: [], answer: 'yes', speak: 'Yebo', audioUrl: 'audio/zu/yebo.mp3', wordId: 'w_yebo' }
      ]
    }
  ]);

  // A pool of words: GET /word-of-day rotates through them by day of the year, so every learner
  // gets a fresh word each day without anyone having to seed one daily. (dateKey 'pool-N' never matches a real date.)
  const pool = [
    ['Ubuntu', 'humanity / I am because we are', 'Ubuntu is a Nguni concept meaning a person is a person through other people — a cornerstone of South African culture.'],
    ['Sawubona', 'I see you (hello)', 'Zulu greetings say "I see you": you are acknowledged as a whole person. The reply "Yebo, sawubona" means "Yes, I see you too".'],
    ['Ngiyabonga', 'thank you', 'Gratitude is part of everyday courtesy; adding "kakhulu" makes it "thank you very much".'],
    ['Umndeni', 'family', 'Family in Zulu culture reaches far beyond the household — extended relatives are part of umndeni.'],
    ['Amanzi', 'water', 'Water is central to ceremonies and to daily life; "amanzi" is also heard in many place names.'],
    ['Ukudla', 'food', 'Sharing ukudla is a mark of hospitality: a visitor is always offered something to eat or drink.'],
    ['Hamba kahle', 'go well', 'The farewell to the one leaving; the one staying is told "Sala kahle" (stay well).'],
    ['Umhlaba', 'earth / land', 'Land carries deep meaning: ancestors, belonging and home are all tied to umhlaba.'],
    ['Ithemba', 'hope', 'Ithemba is a common given name and a theme in songs and sayings.'],
    ['Injabulo', 'joy', 'Injabulo is shared joy — celebrations in Zulu culture are communal.']
  ];
  await WordOfDay.create(pool.map(([word, translation, note], i) => ({
    dateKey: `pool-${i}`, lang: 'zu', word, translation, note, audioUrl: ''
  })));

  await Achievement.create([
    { code: 'first_xp', title: 'First Steps', description: 'Earned your first XP.', icon: '🌱' },
    { code: 'streak_3', title: 'On a Roll', description: 'Reached a 3-day streak.', icon: '🔥' },
    { code: 'streak_7', title: 'Week Warrior', description: 'Reached a 7-day streak.', icon: '📅' },
    { code: 'level_5', title: 'Rising Star', description: 'Reached level 5.', icon: '⭐' },
    { code: 'xp_1000', title: 'Fluent Grind', description: 'Earned 1000 XP.', icon: '🏆' }
  ]);

  console.log('[seed] done: 3 courses, 4 lessons, 10 words of the day, 5 achievements');
}

// CLI entry point.
if (require.main === module) {
  connectDb()
    .then(seedDatabase)
    .then(() => mongoose.disconnect())
    .catch((e) => { console.error('[seed] failed', e); process.exit(1); });
}
