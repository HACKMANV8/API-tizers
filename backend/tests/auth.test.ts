/**
 * Authentication Tests
 *
 * Tests for JWT and password hashing utilities
 */

import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
} from '../src/auth/utils';

describe('Authentication Utilities', () => {
  describe('Password hashing', () => {
    it('should hash password successfully', async () => {
      const password = 'testpassword123';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(20);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Salt should make them different
    });

    it('should handle empty password', async () => {
      const hashed = await hashPassword('');
      expect(hashed).toBeDefined();
    });
  });

  describe('Password comparison', () => {
    it('should return true for correct password', async () => {
      const password = 'mySecurePassword!123';
      const hashed = await hashPassword(password);

      const isMatch = await comparePassword(password, hashed);
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'mySecurePassword!123';
      const wrongPassword = 'wrongPassword456';
      const hashed = await hashPassword(password);

      const isMatch = await comparePassword(wrongPassword, hashed);
      expect(isMatch).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'Password123';
      const hashed = await hashPassword(password);

      const isMatch = await comparePassword('password123', hashed);
      expect(isMatch).toBe(false);
    });
  });

  describe('JWT token generation', () => {
    it('should generate valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      };

      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should generate different tokens for different payloads', () => {
      const payload1 = {
        userId: 'user-1',
        email: 'user1@example.com',
        role: 'USER',
      };

      const payload2 = {
        userId: 'user-2',
        email: 'user2@example.com',
        role: 'USER',
      };

      const token1 = generateToken(payload1);
      const token2 = generateToken(payload2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('JWT token verification', () => {
    it('should verify and decode valid token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it('should throw error for tampered token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      };

      const token = generateToken(payload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx'; // Modify signature

      expect(() => verifyToken(tamperedToken)).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => verifyToken('')).toThrow();
    });
  });

  describe('Complete auth flow', () => {
    it('should simulate complete registration flow', async () => {
      // 1. User provides password
      const userPassword = 'SecurePassword123!';

      // 2. Hash password for storage
      const hashedPassword = await hashPassword(userPassword);

      // 3. Generate JWT token after successful registration
      const userPayload = {
        userId: 'user-new-123',
        email: 'newuser@example.com',
        role: 'USER',
      };
      const token = generateToken(userPayload);

      // 4. Verify token is valid
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(userPayload.userId);
      expect(hashedPassword).not.toBe(userPassword);
    });

    it('should simulate complete login flow', async () => {
      // 1. Register: hash and store password
      const originalPassword = 'UserPassword456!';
      const storedHash = await hashPassword(originalPassword);

      // 2. Login: user provides password
      const loginPassword = 'UserPassword456!';

      // 3. Verify password matches stored hash
      const isValid = await comparePassword(loginPassword, storedHash);
      expect(isValid).toBe(true);

      // 4. Generate token on successful login
      const userPayload = {
        userId: 'user-existing-789',
        email: 'existinguser@example.com',
        role: 'USER',
      };
      const token = generateToken(userPayload);

      // 5. Verify token
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(userPayload.userId);
    });
  });
});
