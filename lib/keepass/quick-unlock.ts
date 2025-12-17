import { db } from '@/lib/db';
import type { QuickUnlockSession, QuickUnlockDuration } from './types';
import { QUICK_UNLOCK_DURATIONS, QUICK_UNLOCK_MAX_ATTEMPTS } from './types';

// PBKDF2 iterations for key derivation from PIN
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives an AES-GCM encryption key from a PIN and salt using PBKDF2
 */
async function deriveKeyFromPin(pin: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);

  // Import PIN as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts the master password using a PIN-derived key
 */
async function encryptPassword(
  password: string,
  pin: string
): Promise<{ encrypted: ArrayBuffer; salt: ArrayBuffer; iv: ArrayBuffer }> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key from PIN
  const key = await deriveKeyFromPin(pin, salt.buffer);

  // Encrypt password
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    passwordData
  );

  return {
    encrypted,
    salt: salt.buffer,
    iv: iv.buffer,
  };
}

/**
 * Decrypts the master password using a PIN-derived key
 */
async function decryptPassword(
  encrypted: ArrayBuffer,
  salt: ArrayBuffer,
  iv: ArrayBuffer,
  pin: string
): Promise<string> {
  // Derive key from PIN
  const key = await deriveKeyFromPin(pin, salt);

  // Decrypt password
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Creates a quick unlock session for a database
 */
export async function createQuickUnlockSession(
  databaseId: number,
  password: string,
  pin: string,
  duration: QuickUnlockDuration
): Promise<void> {
  // Remove any existing session for this database
  await deleteQuickUnlockSession(databaseId);

  // Encrypt the password
  const { encrypted, salt, iv } = await encryptPassword(password, pin);

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + QUICK_UNLOCK_DURATIONS[duration].days);

  // Store the session
  const session: QuickUnlockSession = {
    databaseId,
    encryptedPassword: encrypted,
    salt,
    iv,
    expiresAt,
    failedAttempts: 0,
    createdAt: new Date(),
  };

  await db.quickUnlockSessions.add(session);
}

/**
 * Attempts to unlock a database using a PIN
 * Returns the decrypted password on success, throws on failure
 */
export async function unlockWithPin(
  databaseId: number,
  pin: string
): Promise<string> {
  const session = await db.quickUnlockSessions
    .where('databaseId')
    .equals(databaseId)
    .first();

  if (!session) {
    throw new Error('No quick unlock session found');
  }

  // Check if session has expired
  if (new Date() > new Date(session.expiresAt)) {
    await deleteQuickUnlockSession(databaseId);
    throw new Error('Quick unlock session has expired');
  }

  // Check if max attempts exceeded
  if (session.failedAttempts >= QUICK_UNLOCK_MAX_ATTEMPTS) {
    await deleteQuickUnlockSession(databaseId);
    throw new Error('Too many failed attempts. Please use your master password.');
  }

  try {
    const password = await decryptPassword(
      session.encryptedPassword,
      session.salt,
      session.iv,
      pin
    );

    // Reset failed attempts on success
    await db.quickUnlockSessions.update(session.id!, { failedAttempts: 0 });

    return password;
  } catch {
    // Increment failed attempts
    const newAttempts = session.failedAttempts + 1;
    
    if (newAttempts >= QUICK_UNLOCK_MAX_ATTEMPTS) {
      await deleteQuickUnlockSession(databaseId);
      throw new Error('Too many failed attempts. Quick unlock has been disabled.');
    }

    await db.quickUnlockSessions.update(session.id!, { failedAttempts: newAttempts });
    
    const remaining = QUICK_UNLOCK_MAX_ATTEMPTS - newAttempts;
    throw new Error(`Invalid PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
  }
}

/**
 * Checks if a database has an active quick unlock session
 */
export async function hasQuickUnlockSession(databaseId: number): Promise<boolean> {
  const session = await db.quickUnlockSessions
    .where('databaseId')
    .equals(databaseId)
    .first();

  if (!session) {
    return false;
  }

  // Check expiration
  if (new Date() > new Date(session.expiresAt)) {
    await deleteQuickUnlockSession(databaseId);
    return false;
  }

  // Check if locked out
  if (session.failedAttempts >= QUICK_UNLOCK_MAX_ATTEMPTS) {
    await deleteQuickUnlockSession(databaseId);
    return false;
  }

  return true;
}

/**
 * Gets information about a quick unlock session
 */
export async function getQuickUnlockSessionInfo(
  databaseId: number
): Promise<{ expiresAt: Date; failedAttempts: number } | null> {
  const session = await db.quickUnlockSessions
    .where('databaseId')
    .equals(databaseId)
    .first();

  if (!session) {
    return null;
  }

  return {
    expiresAt: new Date(session.expiresAt),
    failedAttempts: session.failedAttempts,
  };
}

/**
 * Deletes a quick unlock session for a database
 */
export async function deleteQuickUnlockSession(databaseId: number): Promise<void> {
  await db.quickUnlockSessions
    .where('databaseId')
    .equals(databaseId)
    .delete();
}

/**
 * Cleans up all expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const now = new Date();
  await db.quickUnlockSessions
    .where('expiresAt')
    .below(now)
    .delete();
}

/**
 * Validates a PIN format
 */
export function validatePin(pin: string): { valid: boolean; error?: string } {
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only digits' };
  }

  if (pin.length < 4) {
    return { valid: false, error: 'PIN must be at least 4 digits' };
  }

  if (pin.length > 6) {
    return { valid: false, error: 'PIN must be at most 6 digits' };
  }

  return { valid: true };
}
