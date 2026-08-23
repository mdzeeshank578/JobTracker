import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  logger.error(`[API Exception] ${statusCode} - ${message}`, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || []
  });
}
