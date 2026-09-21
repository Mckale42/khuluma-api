/** GET /courses/:lang/path — the skill tree: units with their lessons (FR-5). */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { Course } from '../models/Course';
import { Lesson } from '../models/Lesson';
import { HttpError } from '../utils/httpError';

const router = Router();

router.get('/:lang/path', requireAuth, asyncHandler(async (req, res) => {
  const course = await Course.findOne({ lang: req.params.lang });
  if (!course) throw new HttpError(404, 'Course not found.');

  const lessons = await Lesson.find({ courseLang: req.params.lang }).sort({ orderIndex: 1 });
  const units = course.units
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((u) => ({
      unitId: u.unitId,
      title: u.title,
      lessons: lessons
        .filter((l) => l.unitId === u.unitId)
        .map((l) => ({ lessonId: l.lessonId, title: l.title, xpReward: l.xpReward, exercises: l.exercises.length }))
    }));

  res.json({ lang: course.lang, title: course.title, units });
}));

export default router;
