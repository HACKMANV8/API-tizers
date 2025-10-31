// Custom Error Classes

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  public readonly errors: any[];

  constructor(message: string = 'Validation failed', errors: any[] = []) {
    super(message, 422);
    this.errors = errors;
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503);
  }
}

// Error response formatter
export const formatErrorResponse = (error: AppError | Error) => {
  if (error instanceof AppError) {
    const response: any = {
      success: false,
      message: error.message,
      statusCode: error.statusCode,
    };

    if (error instanceof ValidationError && error.errors.length > 0) {
      response.errors = error.errors;
    }

    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
    }

    return response;
  }

  // Handle unknown errors
  return {
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    statusCode: 500,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };
};
