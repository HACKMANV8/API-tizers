import { PrismaClient } from '@prisma/client';
import logger from './logger';

export abstract class BaseService {
  protected prisma: PrismaClient;
  protected logger = logger;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Execute a database transaction
   */
  protected async transaction<T>(
    callback: (tx: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return callback(tx as PrismaClient);
    });
  }

  /**
   * Handle service errors
   */
  protected handleError(error: any, context: string): never {
    this.logger.error(`[${context}] Error:`, error);
    throw error;
  }

  /**
   * Log service info
   */
  protected logInfo(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log service warning
   */
  protected logWarning(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Validate required fields
   */
  protected validateRequired(data: any, fields: string[]): void {
    const missing = fields.filter((field) => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }
}
