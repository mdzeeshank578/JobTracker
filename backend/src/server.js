import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { scheduleFollowUpReminderJob } from './jobs/followUpReminder.job.js';
import { startEmailQueueWorker } from './jobs/emailQueue.worker.js';

const server = app.listen(env.PORT, () => {
  logger.info(`==================================================`);
  logger.info(`🚀 JobTracker Enterprise Backend Running on port ${env.PORT}`);
  logger.info(`🔗 Health Check: ${env.BACKEND_URL}/api/health`);
  logger.info(`==================================================`);
});

scheduleFollowUpReminderJob();
startEmailQueueWorker();

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down HTTP server gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed cleanly.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
