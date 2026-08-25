import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  logger.error(`[API Exception] ${statusCode} - ${message}`, { stack: err.stack });

  // In production, sanitize 500 internal error messages
  if (env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || []
  });
}
