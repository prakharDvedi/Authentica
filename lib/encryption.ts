import crypto from "crypto";

export function deriveKeyFromAddress(userAddress: string): Buffer {
  const salt = Buffer.from("authentica-ipfs-encryption-salt", "utf8");
  return crypto.pbkdf2Sync(
    userAddress.toLowerCase(),
    salt,
    100000,
    32,
    "sha256"
  );
}

export function encryptContent(
  contentBuffer: Buffer,
  userAddress: string
): {
  encrypted: Buffer;
  iv: Buffer;
  tag: Buffer;
  keyHash: string;
} {
  const key = deriveKeyFromAddress(userAddress);

  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(contentBuffer),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  return {
    encrypted,
    iv,
    tag,
    keyHash,
  };
}

export function decryptContent(
  encryptedBuffer: Buffer,
  iv: Buffer,
  tag: Buffer,
  userAddress: string
): Buffer {
  const key = deriveKeyFromAddress(userAddress);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);

  return decrypted;
}

export function createEncryptedPayload(
  encrypted: Buffer,
  iv: Buffer,
  tag: Buffer,
  keyHash: string
): Buffer {
  const keyHashBuffer = Buffer.from(keyHash, "hex");
  return Buffer.concat([keyHashBuffer, iv, tag, encrypted]);
}

export function extractEncryptionComponents(encryptedPayload: Buffer): {
  keyHash: string;
  iv: Buffer;
  tag: Buffer;
  encrypted: Buffer;
} {
  const keyHashBuffer = encryptedPayload.subarray(0, 32);
  const iv = encryptedPayload.subarray(32, 48);
  const tag = encryptedPayload.subarray(48, 64);
  const encrypted = encryptedPayload.subarray(64);

  return {
    keyHash: keyHashBuffer.toString("hex"),
    iv,
    tag,
    encrypted,
  };
}
