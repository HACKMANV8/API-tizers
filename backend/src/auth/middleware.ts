/**
 * Authentication Middleware
 *
 * Provides middleware for protecting routes with JWT authentication
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from './utils';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 * Adds user data to req.user if valid
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Middleware to require admin role
 * Must be used after authenticate middleware
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  next();
}

/**
 * Middleware to validate admin API key
 * Alternative to JWT for internal/admin endpoints
 */
export function validateAdminKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-admin-key'];
  const adminKey = process.env.ADMIN_API_KEY;

  if (!apiKey || apiKey !== adminKey) {
    res.status(403).json({
      success: false,
      message: 'Invalid admin API key',
    });
    return;
  }

  next();
}
