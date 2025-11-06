import crypto from 'crypto';

export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

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
