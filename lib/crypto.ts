/**
 * Cryptographic Hashing Library
 * Provides SHA-256 hashing functions for creating proofs
 */

import crypto from 'crypto';

/**
 * Hash a string using SHA-256
 * Used for hashing prompts and combined data
 */
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Hash a buffer (binary data) using SHA-256
 * Used for hashing generated images
 */
export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate combined hash from multiple components
 * Creates a unique proof hash combining prompt, output, creator, and timestamp
 */
export function generateCombinedHash(
  promptHash: string,
  outputHash: string,
  userAddress: string,
  timestamp: number
): string {
  const combined = `${promptHash}${outputHash}${userAddress}${timestamp}`;
  return hashString(combined);
}

export interface ProofData {
  promptHash: string;
  outputHash: string;
  combinedHash: string;
  userAddress: string;
  timestamp: number;
}

/**
 * Generate complete proof data
 * Creates cryptographic hashes for prompt, output, and combined proof
 * This proof is used to verify authenticity on the blockchain
 */
export function generateProof(
  prompt: string,
  outputBuffer: Buffer,
  userAddress: string,
  timestamp: number
): ProofData {
  const promptHash = hashString(prompt);
  const outputHash = hashBuffer(outputBuffer);
  const combinedHash = generateCombinedHash(promptHash, outputHash, userAddress, timestamp);

  return {
    promptHash,
    outputHash,
    combinedHash,
    userAddress,
    timestamp,
  };
}
