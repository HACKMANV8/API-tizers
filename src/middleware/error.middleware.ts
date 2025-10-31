import { Request, Response, NextFunction } from 'express';
import { AppError, formatErrorResponse } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error with safe serialization
  logger.error('Error occurred:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Format and send error response
  const errorResponse = formatErrorResponse(error);
  res.status(errorResponse.statusCode).json(errorResponse);
};

/**
 * Handle 404 not found
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    statusCode: 404,
  });
};

/**
 * Handle async errors (alternative to express-async-errors)
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
