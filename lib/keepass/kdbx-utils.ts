import * as kdbxweb from "kdbxweb";
import { argon2id, argon2d } from "hash-wasm";
import type { KeePassEntry, KeePassGroup } from "./types";

// Flag to track if Argon2 has been initialized
let argon2Initialized = false;

/**
 * Initialize Argon2 implementation for kdbxweb
 * This must be called before opening KDBX4 files
 */
export function initializeArgon2(): void {
  if (argon2Initialized) return;

  kdbxweb.CryptoEngine.setArgon2Impl(
    async (
      password: ArrayBuffer,
      salt: ArrayBuffer,
      memory: number,
      iterations: number,
      length: number,
      parallelism: number,
      type: number,
      _version: number
    ): Promise<ArrayBuffer> => {
      // Type 0 = Argon2d, Type 1 = Argon2i, Type 2 = Argon2id
      const hashFn = type === 0 ? argon2d : argon2id;
      
      const result = await hashFn({
        password: new Uint8Array(password),
        salt: new Uint8Array(salt),
        memorySize: memory / 1024, // hash-wasm uses KiB
        iterations: iterations,
        hashLength: length,
        parallelism: parallelism,
        outputType: "binary",
      });
      
      return result.buffer as ArrayBuffer;
    }
  );

  argon2Initialized = true;
}

/**
 * Open and decrypt a KeePass database
 */
export async function openDatabase(
  fileData: ArrayBuffer,
  password: string,
  keyFileData?: ArrayBuffer
): Promise<kdbxweb.Kdbx> {
  // Initialize Argon2 if not already done
  initializeArgon2();

  // Create credentials
  const credentials = new kdbxweb.Credentials(
    kdbxweb.ProtectedValue.fromString(password),
    keyFileData
  );

  // Load and decrypt the database
  const db = await kdbxweb.Kdbx.load(fileData, credentials);

  return db;
}

/**
 * Extract all groups from a KeePass database
 */
export function extractGroups(db: kdbxweb.Kdbx): KeePassGroup[] {
  const groups: KeePassGroup[] = [];

  function processGroup(group: kdbxweb.KdbxGroup, parentUuid?: string): void {
    const groupData: KeePassGroup = {
      uuid: group.uuid.toString(),
      name: group.name || "Unnamed Group",
      icon: group.icon ?? 0,
      parentUuid,
    };
    groups.push(groupData);

    // Process child groups recursively
    if (group.groups) {
      for (const childGroup of group.groups) {
        processGroup(childGroup, groupData.uuid);
      }
    }
  }

  // Start with the root group
  if (db.groups && db.groups.length > 0) {
    for (const rootGroup of db.groups) {
      processGroup(rootGroup);
    }
  }

  return groups;
}

/**
 * Extract all entries from a KeePass database
 */
export function extractEntries(db: kdbxweb.Kdbx): KeePassEntry[] {
  const entries: KeePassEntry[] = [];

  function processGroup(group: kdbxweb.KdbxGroup): void {
    // Process entries in this group
    if (group.entries) {
      for (const entry of group.entries) {
        const entryData = extractEntry(entry, group.uuid.toString());
        entries.push(entryData);
      }
    }

    // Process child groups recursively
    if (group.groups) {
      for (const childGroup of group.groups) {
        processGroup(childGroup);
      }
    }
  }

  // Start with the root group
  if (db.groups && db.groups.length > 0) {
    for (const rootGroup of db.groups) {
      processGroup(rootGroup);
    }
  }

  return entries;
}

/**
 * Extract a single entry's data
 */
function extractEntry(entry: kdbxweb.KdbxEntry, groupUuid: string): KeePassEntry {
  const getFieldValue = (fieldName: string): string => {
    const field = entry.fields.get(fieldName);
    if (!field) return "";
    if (field instanceof kdbxweb.ProtectedValue) {
      return field.getText() || "";
    }
    return String(field);
  };

  return {
    uuid: entry.uuid.toString(),
    title: getFieldValue("Title"),
    username: getFieldValue("UserName"),
    password: getFieldValue("Password"),
    url: getFieldValue("URL"),
    notes: getFieldValue("Notes"),
    icon: entry.icon ?? 0,
    groupUuid,
    createdAt: entry.times.creationTime,
    modifiedAt: entry.times.lastModTime,
    tags: entry.tags || [],
  };
}

/**
 * Get entries for a specific group
 */
export function getEntriesForGroup(
  entries: KeePassEntry[],
  groupUuid: string
): KeePassEntry[] {
  return entries.filter((entry) => entry.groupUuid === groupUuid);
}

/**
 * Get child groups for a specific parent group
 */
export function getChildGroups(
  groups: KeePassGroup[],
  parentUuid?: string
): KeePassGroup[] {
  return groups.filter((group) => group.parentUuid === parentUuid);
}

/**
 * Search entries by query string
 */
export function searchEntries(
  entries: KeePassEntry[],
  query: string
): KeePassEntry[] {
  if (!query.trim()) return entries;

  const lowerQuery = query.toLowerCase();
  return entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(lowerQuery) ||
      entry.username.toLowerCase().includes(lowerQuery) ||
      entry.url.toLowerCase().includes(lowerQuery) ||
      entry.notes.toLowerCase().includes(lowerQuery) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Build a tree structure of groups
 */
export function buildGroupTree(groups: KeePassGroup[]): KeePassGroup[] {
  // Get root groups (those without a parent)
  return groups.filter((group) => !group.parentUuid);
}

/**
 * Get the root group (first group without parent)
 */
export function getRootGroup(groups: KeePassGroup[]): KeePassGroup | undefined {
  return groups.find((group) => !group.parentUuid);
}
