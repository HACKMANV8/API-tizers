import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from './response';
import logger from './logger';

export abstract class BaseController {
  /**
   * Execute a controller action with error handling
   */
  protected async execute(
    req: Request,
    res: Response,
    next: NextFunction,
    handler: (req: Request, res: Response) => Promise<void>
  ): Promise<void> {
    try {
      await handler(req, res);
    } catch (error) {
      logger.error('Controller error:', error);
      next(error);
    }
  }

  /**
   * Send success response
   */
  protected success<T>(res: Response, data: T, message?: string, statusCode?: number): Response {
    return ResponseHandler.success(res, data, message, statusCode);
  }

  /**
   * Send created response
   */
  protected created<T>(res: Response, data: T, message?: string): Response {
    return ResponseHandler.created(res, data, message);
  }

  /**
   * Send paginated response
   */
  protected paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): Response {
    return ResponseHandler.paginated(res, data, page, limit, total, message);
  }

  /**
   * Send no content response
   */
  protected noContent(res: Response): Response {
    return ResponseHandler.noContent(res);
  }

  /**
   * Get pagination parameters from request
   */
  protected getPagination(req: Request): { page: number; limit: number; skip: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Get user ID from authenticated request
   */
  protected getUserId(req: Request): string {
    return (req as any).user?.id || (req as any).userId;
  }
}
