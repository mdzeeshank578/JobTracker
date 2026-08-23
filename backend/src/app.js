import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { rateLimiterMiddleware } from './middlewares/rateLimiter.middleware.js';

const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));

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
