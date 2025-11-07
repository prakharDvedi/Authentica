/**
 * Encryption Library for IPFS Privacy
 * Encrypts content before uploading to IPFS to prevent unauthorized access
 * Only authorized users (creators) can decrypt their content
 */

import crypto from 'crypto';

/**
 * Derive encryption key from user's wallet address
 * Uses PBKDF2 to create a deterministic key from the address
 */
export function deriveKeyFromAddress(userAddress: string): Buffer {
  // Use PBKDF2 to derive a 32-byte key from the address
  // Salt is fixed for deterministic key generation
  const salt = Buffer.from('authentica-ipfs-encryption-salt', 'utf8');
  return crypto.pbkdf2Sync(userAddress.toLowerCase(), salt, 100000, 32, 'sha256');
}

/**
 * Encrypt content buffer using AES-256-GCM
 * Works for both images and audio files
 * Uses user's wallet address to derive encryption key
 */
export function encryptContent(
  contentBuffer: Buffer,
  userAddress: string
): {
  encrypted: Buffer;
  iv: Buffer;
  tag: Buffer;
  keyHash: string;
} {
  // Derive encryption key from user address
  const key = deriveKeyFromAddress(userAddress);

  // Generate random IV (initialization vector)
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Encrypt content (works for images, audio, etc.)
  const encrypted = Buffer.concat([
    cipher.update(contentBuffer),
    cipher.final(),
  ]);

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Hash key for storage (don't store actual key)
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');

  return {
    encrypted,
    iv,
    tag,
    keyHash,
  };
}

/**
 * Decrypt content buffer
 * Only works if user has the correct address (key derivation)
 */
export function decryptContent(
  encryptedBuffer: Buffer,
  iv: Buffer,
  tag: Buffer,
  userAddress: string
): Buffer {
  // Derive the same key from user address
  const key = deriveKeyFromAddress(userAddress);

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  // Decrypt content
  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);

  return decrypted;
}

/**
 * Create encrypted payload for IPFS storage
 * Combines IV, tag, and encrypted data into a single buffer
 */
export function createEncryptedPayload(
  encrypted: Buffer,
  iv: Buffer,
  tag: Buffer,
  keyHash: string
): Buffer {
  // Format: [keyHash (32 bytes hex = 64 chars)] [IV (16 bytes)] [tag (16 bytes)] [encrypted data]
  const keyHashBuffer = Buffer.from(keyHash, 'hex');
  return Buffer.concat([keyHashBuffer, iv, tag, encrypted]);
}

/**
 * Extract encryption components from encrypted payload
 */
export function extractEncryptionComponents(encryptedPayload: Buffer): {
  keyHash: string;
  iv: Buffer;
  tag: Buffer;
  encrypted: Buffer;
} {
  // Extract components in reverse order
  const keyHashBuffer = encryptedPayload.subarray(0, 32);
  const iv = encryptedPayload.subarray(32, 48);
  const tag = encryptedPayload.subarray(48, 64);
  const encrypted = encryptedPayload.subarray(64);

  return {
    keyHash: keyHashBuffer.toString('hex'),
    iv,
    tag,
    encrypted,
  };
}

