import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../auth/jwt.service';
import { UnauthorizedError } from '../utils/errors';
import prisma from '../config/database';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
    }
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = JwtService.verifyAccessToken(token);

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, username: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account is inactive');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    // Update last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = JwtService.verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, username: true, isActive: true },
      });

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
        };
      }
    }
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Middleware to verify email is verified
 */
export const requireEmailVerified = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { emailVerified: true },
    });

    if (!user?.emailVerified) {
      throw new UnauthorizedError('Email verification required');
    }

    next();
  } catch (error) {
    next(error);
  }
};
