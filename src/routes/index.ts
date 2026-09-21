/** Mounts every resource router under /api. */
import { Router } from 'express';
import me from './me';
import courses from './courses';
import lessons from './lessons';
import attempts from './attempts';
import review from './review';
import ai from './ai';
import leaderboard from './leaderboard';
import wordOfDay from './wordOfDay';
import sync from './sync';

const api = Router();
api.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Khuluma API' }));
api.use('/me', me);
api.use('/courses', courses);
api.use('/lessons', lessons);
api.use('/attempts', attempts);
api.use('/review', review);
api.use('/ai', ai);
api.use('/leaderboard', leaderboard);
api.use('/word-of-day', wordOfDay);
api.use('/sync', sync);

export default api;
