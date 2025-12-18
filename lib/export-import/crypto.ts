// Encryption utilities for export/import

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;

/**
 * Derive an encryption key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key from password
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with a password
 * Returns { salt, iv, data } as base64 strings
 */
export async function encryptWithPassword(
  data: string,
  password: string
): Promise<{ salt: string; iv: string; data: string }> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encrypt data
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    dataBuffer
  );

  // Convert to base64
  return {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(encryptedBuffer),
  };
}

/**
 * Decrypt data with a password
 * Takes { salt, iv, data } as base64 strings
 */
export async function decryptWithPassword(
  encrypted: { salt: string; iv: string; data: string },
  password: string
): Promise<string> {
  // Convert from base64
  const salt = base64ToArrayBuffer(encrypted.salt);
  const iv = base64ToArrayBuffer(encrypted.iv);
  const encryptedData = base64ToArrayBuffer(encrypted.data);

  // Derive key from password
  const key = await deriveKey(password, new Uint8Array(salt));

  // Decrypt data
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encryptedData
  );

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
