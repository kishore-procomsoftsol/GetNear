import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import router from './routes/index';

// ─── Sentry ──────────────────────────────────────────────────────────────────
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  // Only enable tracing in production to avoid noise in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 0,
});

// ─── App ─────────────────────────────────────────────────────────────────────
const app = express();

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS (design §13.4) ─────────────────────────────────────────────────────
const allowedOrigins: string[] = [
  'https://getnear.ai',
  'https://www.getnear.ai',
  'https://admin.getnear.ai',
  'https://getnear.in',
  'https://admin.getnear.in',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true, // Allow cookies (refresh token)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', router);

// ─── Sentry error handler (must be after routes, before other error handlers) ─
Sentry.setupExpressErrorHandler(app);

// ─── Server ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 4000;

const server = app.listen(PORT, () => {
  console.log(`[api] Server running on port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
});

// Export app for testing (supertest etc.)
export { app, server };
export default app;
// deployed from GitHub


