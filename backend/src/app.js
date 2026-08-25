import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { rateLimiterMiddleware } from './middlewares/rateLimiter.middleware.js';

import { env } from './config/env.js';

const app = express();
app.disable('x-powered-by');

// Enterprise Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

const allowedOrigins = (env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (
        env.NODE_ENV !== 'production' ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:')
      ) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy violation: Origin not allowed by server security configuration.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(rateLimiterMiddleware);
app.use(authMiddleware);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'JobTracker Enterprise Backend API active.' });
});

// Primary API Router Mount
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
