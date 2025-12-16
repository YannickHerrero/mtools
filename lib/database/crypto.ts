import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT = "mtools-database-salt"; // Static salt for key derivation

function getKey(): Buffer {
  const secret = process.env.DATABASE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("DATABASE_ENCRYPTION_KEY environment variable is not set");
  }
  // Derive a 32-byte key from the secret using scrypt
  return scryptSync(secret, SALT, 32);
}

/**
 * Encrypts a plain text string using AES-256-GCM
 * @param text - The plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (hex encoded)
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string using AES-256-GCM
 * @param encryptedText - The encrypted string in format: iv:authTag:encryptedData
 * @returns The decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  const [ivHex, authTagHex, encrypted] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Checks if the encryption key is configured
 * @returns true if DATABASE_ENCRYPTION_KEY is set
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.DATABASE_ENCRYPTION_KEY;
}
