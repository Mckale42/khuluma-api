/** Khuluma API entry point — Express app, middleware and startup. */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDb } from './config/db';
import api from './routes';
import { errorHandler } from './middleware/error';

export function createApp() {
  const app = express();
  app.use(helmet());                 // NR-4 security headers
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));            // request logging
  // Health/root routes — used by Render health checks and quick liveness checks.
  app.get('/', (_req, res) => res.json({ service: 'Khuluma API', status: 'ok', docs: '/api' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  app.use('/api', api);
  app.use(errorHandler);
  return app;
}

async function start() {
  await connectDb();
  const app = createApp();
  app.listen(env.port, () => console.log(`[server] Khuluma API listening on :${env.port}`));
}

// Only auto-start when run directly (tests import createApp without a DB).
if (require.main === module) {
  start().catch((e) => {
    console.error('[fatal]', e);
    process.exit(1);
  });
}
