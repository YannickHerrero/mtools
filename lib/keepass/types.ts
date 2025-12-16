import type { Kdbx } from "kdbxweb";

// Stored in IndexedDB
export interface KeePassDatabase {
  id?: number;
  name: string;                    // User-friendly name
  fileName: string;                // Original file name
  fileData: ArrayBuffer;           // Encrypted .kdbx file content
  keyFileName?: string;            // Optional key file name
  keyFileData?: ArrayBuffer;       // Optional key file content
  lastOpened?: Date;               // Last time database was unlocked
  createdAt: Date;
  updatedAt: Date;
}

// Runtime types (not stored in DB)
export interface UnlockedDatabase {
  id: number;
  name: string;
  db: Kdbx;
}

export interface KeePassEntry {
  uuid: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  icon: number;
  groupUuid: string;
  createdAt?: Date;
  modifiedAt?: Date;
  tags: string[];
}

export interface KeePassGroup {
  uuid: string;
  name: string;
  icon: number;
  parentUuid?: string;
  expanded?: boolean;
}

// Input types
export interface AddDatabaseInput {
  name: string;
  file: File;
  keyFile?: File;
}

// Standard KeePass icons (subset of commonly used ones)
export const KEEPASS_ICONS: Record<number, string> = {
  0: "key",           // Key
  1: "globe",         // World
  2: "warning",       // Warning
  3: "server",        // Server
  4: "folder",        // Folder
  5: "user",          // User
  9: "mail",          // Email
  12: "wifi",         // Network
  19: "terminal",     // Console
  23: "printer",      // Printer
  25: "disc",         // Disk
  29: "phone",        // Phone
  30: "email",        // Email
  34: "camera",       // Camera
  38: "monitor",      // Monitor
  41: "file",         // Document
  48: "settings",     // Settings
  49: "tool",         // Tool
  54: "credit-card",  // Credit card
  57: "box",          // Package
  61: "trash",        // Trash
  62: "sticky-note",  // Note
  68: "clock",        // Clock
};
