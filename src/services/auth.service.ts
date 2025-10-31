import { PrismaClient, User } from '@prisma/client';
import { BaseService } from '../utils/base-service';
import { JwtService, TokenPair, JwtPayload } from '../auth/jwt.service';
import { PasswordService } from '../auth/password.service';
import {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
} from '../utils/errors';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  fullName?: string;
}

export interface LoginData {
  emailOrUsername: string;
  password: string;
}

export interface AuthResponse {
  user: Partial<User>;
  tokens: TokenPair;
}

export class AuthService extends BaseService {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Validate password strength
      const passwordValidation = PasswordService.validateStrength(data.password);
      if (!passwordValidation.valid) {
        throw new BadRequestError(passwordValidation.errors.join(', '));
      }

      // Check if email already exists
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (existingEmail) {
        throw new ConflictError('Email already registered');
      }

      // Check if username already exists
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: data.username.toLowerCase() },
      });
      if (existingUsername) {
        throw new ConflictError('Username already taken');
      }

      // Hash password
      const passwordHash = await PasswordService.hash(data.password);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          username: data.username.toLowerCase(),
          passwordHash,
          fullName: data.fullName,
        },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const tokens = JwtService.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      this.logInfo('User registered successfully', { userId: user.id, email: user.email });

      return { user, tokens };
    } catch (error) {
      this.handleError(error, 'AuthService.register');
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      // Find user by email or username
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: data.emailOrUsername.toLowerCase() },
            { username: data.emailOrUsername.toLowerCase() },
          ],
        },
      });

      if (!user || !user.passwordHash) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedError('Account is inactive');
      }

      // Verify password
      const isPasswordValid = await PasswordService.compare(data.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Update last active
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastActive: new Date() },
      });

      // Generate tokens
      const tokens = JwtService.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      this.logInfo('User logged in successfully', { userId: user.id, email: user.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
        },
        tokens,
      };
    } catch (error) {
      this.handleError(error, 'AuthService.login');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const payload = JwtService.verifyRefreshToken(refreshToken);

      // Check if user exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, username: true, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is inactive');
      }

      // Generate new token pair
      const tokens = JwtService.generateTokenPair({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      return tokens;
    } catch (error) {
      this.handleError(error, 'AuthService.refreshToken');
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const { userId, email } = JwtService.verifyEmailVerificationToken(token);

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (user.email !== email) {
        throw new BadRequestError('Invalid verification token');
      }

      if (user.emailVerified) {
        throw new BadRequestError('Email already verified');
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });

      this.logInfo('Email verified successfully', { userId, email });
    } catch (error) {
      this.handleError(error, 'AuthService.verifyEmail');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Don't reveal if user exists or not for security
      if (!user) {
        this.logInfo('Password reset requested for non-existent email', { email });
        return 'If the email exists, a password reset link has been sent';
      }

      const resetToken = JwtService.generatePasswordResetToken(user.id, user.email);

      this.logInfo('Password reset token generated', { userId: user.id, email: user.email });

      // TODO: Send email with reset link
      // await emailService.sendPasswordResetEmail(user.email, resetToken);

      return resetToken; // In production, don't return token, send via email
    } catch (error) {
      this.handleError(error, 'AuthService.requestPasswordReset');
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const { userId } = JwtService.verifyPasswordResetToken(token);

      // Validate new password
      const passwordValidation = PasswordService.validateStrength(newPassword);
      if (!passwordValidation.valid) {
        throw new BadRequestError(passwordValidation.errors.join(', '));
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Hash new password
      const passwordHash = await PasswordService.hash(newPassword);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      this.logInfo('Password reset successfully', { userId });
    } catch (error) {
      this.handleError(error, 'AuthService.resetPassword');
    }
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.passwordHash) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isPasswordValid = await PasswordService.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Validate new password
      const passwordValidation = PasswordService.validateStrength(newPassword);
      if (!passwordValidation.valid) {
        throw new BadRequestError(passwordValidation.errors.join(', '));
      }

      // Hash new password
      const passwordHash = await PasswordService.hash(newPassword);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      this.logInfo('Password changed successfully', { userId });
    } catch (error) {
      this.handleError(error, 'AuthService.changePassword');
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<Partial<User>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          bio: true,
          location: true,
          website: true,
          totalPoints: true,
          currentStreak: true,
          longestStreak: true,
          emailVerified: true,
          createdAt: true,
          lastActive: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return user;
    } catch (error) {
      this.handleError(error, 'AuthService.getProfile');
    }
  }
}
