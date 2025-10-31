import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JwtService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  /**
   * Generate token pair (access + refresh)
   */
  static generateTokenPair(payload: JwtPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid access token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decode(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(userId: string, email: string): string {
    return jwt.sign({ userId, email, type: 'email_verification' }, config.jwt.secret, {
      expiresIn: '24h',
    });
  }

  /**
   * Verify email verification token
   */
  static verifyEmailVerificationToken(token: string): { userId: string; email: string } {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as any;
      if (payload.type !== 'email_verification') {
        throw new UnauthorizedError('Invalid verification token');
      }
      return { userId: payload.userId, email: payload.email };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(userId: string, email: string): string {
    return jwt.sign({ userId, email, type: 'password_reset' }, config.jwt.secret, {
      expiresIn: '1h',
    });
  }

  /**
   * Verify password reset token
   */
  static verifyPasswordResetToken(token: string): { userId: string; email: string } {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as any;
      if (payload.type !== 'password_reset') {
        throw new UnauthorizedError('Invalid reset token');
      }
      return { userId: payload.userId, email: payload.email };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }
  }
}
