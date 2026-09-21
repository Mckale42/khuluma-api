/** Central error handler — turns thrown errors into clean JSON (NR-3). */
import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error.' });
}
