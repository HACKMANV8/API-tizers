import crypto from 'crypto';
import { AppError } from '../utils/errors';

/**
 * EncryptionService provides AES-256-GCM encryption/decryption for sensitive data
 * Used for encrypting external API tokens, OAuth tokens, and other credentials
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      console.error('[EncryptionService] ENCRYPTION_KEY is not set in environment');
      throw new AppError(
        'ENCRYPTION_KEY environment variable is not set. Generate one using: openssl rand -hex 32',
        500
      );
    }

    // Validate key length (must be 32 bytes for AES-256)
    if (encryptionKey.length !== 64) { // 32 bytes = 64 hex characters
      console.error(`[EncryptionService] ENCRYPTION_KEY has wrong length: ${encryptionKey.length}, expected 64`);
      throw new AppError(
        'ENCRYPTION_KEY must be 32 bytes (64 hex characters). Generate using: openssl rand -hex 32',
        500
      );
    }

    this.key = Buffer.from(encryptionKey, 'hex');
    console.log('[EncryptionService] Encryption service initialized successfully');
  }

  /**
   * Encrypts a string using AES-256-GCM
   * @param text - Plain text to encrypt
   * @returns Encrypted string in format: iv:authTag:encryptedData
   */
  encrypt(text: string): string {
    try {
      if (!text) {
        throw new AppError('Cannot encrypt empty text', 400);
      }

      // Generate random initialization vector
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag for GCM mode
      const authTag = cipher.getAuthTag();

      // Return as iv:authTag:encrypted format
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new AppError(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Decrypts a string that was encrypted with encrypt()
   * @param encryptedText - Encrypted string in format: iv:authTag:encryptedData
   * @returns Decrypted plain text
   */
  decrypt(encryptedText: string): string {
    try {
      if (!encryptedText) {
        throw new AppError('Cannot decrypt empty text', 400);
      }

      // Parse the encrypted format
      const parts = encryptedText.split(':');

      if (parts.length !== 3) {
        throw new AppError(
          'Invalid encrypted format. Expected format: iv:authTag:encryptedData',
          400
        );
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the text
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new AppError(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Checks if a string appears to be encrypted by this service
   * @param text - String to check
   * @returns true if the string matches the encrypted format
   */
  isEncrypted(text: string): boolean {
    if (!text) return false;

    const parts = text.split(':');
    if (parts.length !== 3) return false;

    // Check if parts are valid hex strings of expected lengths
    const ivValid = /^[0-9a-f]{32}$/i.test(parts[0]); // 16 bytes = 32 hex chars
    const authTagValid = /^[0-9a-f]{32}$/i.test(parts[1]); // 16 bytes = 32 hex chars
    const dataValid = /^[0-9a-f]+$/i.test(parts[2]); // Variable length hex

    return ivValid && authTagValid && dataValid;
  }

  /**
   * Generates a secure random encryption key
   * Useful for initial setup or key rotation
   * @returns 32-byte key as hex string
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
