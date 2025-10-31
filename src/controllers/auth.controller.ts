import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { BaseController } from '../utils/base-controller';
import prisma from '../config/database';
import { JwtService } from '../auth/jwt.service';
import { User } from '@prisma/client';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService(prisma);
  }

  /**
   * POST /api/auth/register
   * Register a new user
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.execute(req, res, next, async (req, res) => {
      const { email, username, password, fullName } = req.body;

      const result = await this.authService.register({
        email,
        username,
        password,
        fullName,
      });

      this.created(res, result, 'User registered successfully');
    });
  };

  /**
   * POST /api/auth/login
   * Login user
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.execute(req, res, next, async (req, res) => {
      const { emailOrUsername, password } = req.body;

      const result = await this.authService.login({
        emailOrUsername,
        password,
      });

      this.success(res, result, 'Login successful');
    });
  };

  /**
   * POST /api/auth/refresh
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.execute(req, res, next, async (req, res) => {
      const { refreshToken } = req.body;

      const tokens = await this.authService.refreshToken(refreshToken);

      this.success(res, tokens, 'Token refreshed successfully');
    });
  };

  /**
   * POST /api/auth/logout
   * Logout user (client-side token removal)
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.execute(req, res, next, async (req, res) => {
      // In a stateless JWT system, logout is handled client-side
      // Optionally implement token blacklisting here
      this.success(res, null, 'Logout successful');
    });
  };

  /**
   * GET /api/auth/verify-email/:token
   * Verify user email
   */
  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.execute(req, res, next, async (req, res) => {
      const { token } = req.params;

      await this.authService.verifyEmail(token);

      this.success(res, null, 'Email verified successfully');
    });
  };

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.execute(req, res, next, async (req, res) => {
      const { email } = req.body;

      const resetToken = await this.authService.requestPasswordReset(email);

      // In production, don't return token, send via email
      this.success(
        res,
        process.env.NODE_ENV === 'development' ? { resetToken } : null,
        'If the email exists, a password reset link has been sent'
      );
    });
  };

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.execute(req, res, next, async (req, res) => {
      const { token, newPassword } = req.body;

      await this.authService.resetPassword(token, newPassword);

      this.success(res, null, 'Password reset successfully');
    });
  };

  /**
   * POST /api/auth/change-password
   * Change password (requires authentication)
   */
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.execute(req, res, next, async (req, res) => {
      const userId = this.getUserId(req);
      const { currentPassword, newPassword } = req.body;

      await this.authService.changePassword(userId, currentPassword, newPassword);

      this.success(res, null, 'Password changed successfully');
    });
  };

  /**
   * GET /api/auth/profile
   * Get authenticated user profile
   */
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await this.execute(req, res, next, async (req, res) => {
      const userId = this.getUserId(req);

      const profile = await this.authService.getProfile(userId);

      this.success(res, profile, 'Profile retrieved successfully');
    });
  };

  /**
   * GET /api/auth/google/callback
   * Handle Google OAuth callback
   */
  googleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User is attached to req by passport
      const user = req.user as User;

      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?error=google_auth_failed`);
      }

      // Generate JWT tokens for the user
      const tokens = JwtService.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username || user.email.split('@')[0],
      });

      // Redirect to frontend with tokens
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  };
}
