import { db } from '../db';
import { decryptWithPassword, base64ToArrayBuffer } from './crypto';
import type {
  ExportFile,
  EncryptedExportFile,
  ImportResult,
  ImportOptions,
  ExportModule,
  SerializedQuickUnlockSession,
} from './types';
import { EXPORT_MAGIC, EXPORT_VERSION } from './types';
import type { Collection, Folder, SavedRequest, RequestHistory } from '../api-client/types';
import type { Task } from '../tasks/types';
import type { Note, NoteCollection, NoteFolder } from '../notes/types';
import type { DatabaseConnection, QueryHistoryEntry } from '../database/types';
import type { Whiteboard, WhiteboardCollection, WhiteboardFolder } from '../whiteboard/types';
import type { Bookmark, BookmarkCategory } from '../bookmarks/types';
import type { KeePassDatabase, QuickUnlockSession } from '../keepass/types';

/**
 * Import data from an encrypted export file
 * Uses timestamp-based merge: newer items overwrite older ones
 */
export async function importData(
  fileContent: string,
  options: ImportOptions
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    modules: [],
    totalImported: 0,
    totalSkipped: 0,
    errors: [],
  };

  try {
    // Parse the encrypted file
    const encryptedFile = JSON.parse(fileContent) as EncryptedExportFile;

    // Validate magic and version
    if (encryptedFile.magic !== EXPORT_MAGIC) {
      result.errors.push('Invalid export file format');
      return result;
    }

    if (!encryptedFile.encrypted) {
      result.errors.push('Export file is not encrypted');
      return result;
    }

    // Decrypt the data
    let decryptedData: string;
    try {
      decryptedData = await decryptWithPassword(
        {
          salt: encryptedFile.salt,
          iv: encryptedFile.iv,
          data: encryptedFile.data,
        },
        options.password
      );
    } catch {
      result.errors.push('Invalid password or corrupted file');
      return result;
    }

    // Parse the decrypted export file
    const exportFile = JSON.parse(decryptedData) as ExportFile;

    // Check version compatibility
    if (exportFile.version !== EXPORT_VERSION) {
      result.errors.push(
        `Version mismatch: file version ${exportFile.version}, expected ${EXPORT_VERSION}`
      );
      return result;
    }

    // Import each module
    for (const mod of exportFile.modules) {
      const moduleResult = await importModule(mod, exportFile);
      result.modules.push(moduleResult);
      result.totalImported += moduleResult.imported;
      result.totalSkipped += moduleResult.skipped;
      if (moduleResult.errors.length > 0) {
        result.errors.push(...moduleResult.errors.map((e) => `[${mod}] ${e}`));
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

async function importModule(
  module: ExportModule,
  exportFile: ExportFile
): Promise<ImportResult['modules'][0]> {
  const moduleResult = {
    module,
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    switch (module) {
      case 'apiClient':
        if (exportFile.data.apiClient) {
          const r = await importApiClient(exportFile.data.apiClient);
          moduleResult.imported = r.imported;
          moduleResult.skipped = r.skipped;
        }
        break;
      case 'tasks':
        if (exportFile.data.tasks) {
          const r = await importTasks(exportFile.data.tasks);
          moduleResult.imported = r.imported;
          moduleResult.skipped = r.skipped;
        }
        break;
      case 'notes':
        if (exportFile.data.notes) {
          const r = await importNotes(exportFile.data.notes);
          moduleResult.imported = r.imported;
          moduleResult.skipped = r.skipped;
        }
        break;
      case 'database':
        if (exportFile.data.database) {
          const r = await importDatabase(exportFile.data.database);
          moduleResult.imported = r.imported;
          moduleResult.skipped = r.skipped;
        }
        break;
      case 'whiteboards':
        if (exportFile.data.whiteboards) {
          const r = await importWhiteboards(exportFile.data.whiteboards);
          moduleResult.imported = r.imported;
          moduleResult.skipped = r.skipped;
        }
        break;
      case 'bookmarks':
        if (exportFile.data.bookmarks) {
          const r = await importBookmarks(exportFile.data.bookmarks);
          moduleResult.imported = r.imported;
          moduleResult.skipped = r.skipped;
        }
        break;
      case 'keepass':
        if (exportFile.data.keepass) {
          const r = await importKeepass(exportFile.data.keepass);
          moduleResult.imported = r.imported;
          moduleResult.skipped = r.skipped;
        }
        break;
    }
  } catch (error) {
    moduleResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return moduleResult;
}

// Helper to compare timestamps - returns true if incoming is newer
function isNewer(incoming: Date | string | undefined, existing: Date | string | undefined): boolean {
  if (!incoming) return false;
  if (!existing) return true;
  const incomingDate = incoming instanceof Date ? incoming : new Date(incoming);
  const existingDate = existing instanceof Date ? existing : new Date(existing);
  return incomingDate > existingDate;
}

// Helper to convert Date strings back to Date objects
function parseDates<T>(obj: T, dateFields: string[]): T {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj } as Record<string, unknown>;
  for (const field of dateFields) {
    if (field in result && result[field]) {
      result[field] = new Date(result[field] as string);
    }
  }
  return result as T;
}

const COMMON_DATE_FIELDS = ['createdAt', 'updatedAt'];
const HISTORY_DATE_FIELDS = [...COMMON_DATE_FIELDS, 'executedAt'];
const KEEPASS_DATE_FIELDS = [...COMMON_DATE_FIELDS, 'lastOpened', 'expiresAt'];

// Helper to omit the id field for new records
function omitId<T extends { id?: number }>(obj: T): Omit<T, 'id'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = obj;
  return rest;
}

async function importApiClient(data: NonNullable<ExportFile['data']['apiClient']>) {
  let imported = 0;
  let skipped = 0;

  // Import collections
  for (const incoming of data.collections) {
    const parsed = parseDates<Collection>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.collections.get(parsed.id) : null;
    
    if (!existing) {
      // New item - add without id to get auto-generated id
      await db.collections.add(omitId(parsed) as Collection);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.collections.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  // Import folders
  for (const incoming of data.folders) {
    const parsed = parseDates<Folder>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.folders.get(parsed.id) : null;
    
    if (!existing) {
      await db.folders.add(omitId(parsed) as Folder);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.folders.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  // Import saved requests
  for (const incoming of data.savedRequests) {
    const parsed = parseDates<SavedRequest>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.savedRequests.get(parsed.id) : null;
    
    if (!existing) {
      await db.savedRequests.add(omitId(parsed) as SavedRequest);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.savedRequests.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  // Import request history
  for (const incoming of data.requestHistory) {
    const parsed = parseDates<RequestHistory>(incoming, HISTORY_DATE_FIELDS);
    const existing = parsed.id ? await db.requestHistory.get(parsed.id) : null;
    
    if (!existing) {
      await db.requestHistory.add(omitId(parsed) as RequestHistory);
      imported++;
    } else if (isNewer(parsed.executedAt, existing.executedAt)) {
      await db.requestHistory.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importTasks(data: Task[]) {
  let imported = 0;
  let skipped = 0;

  for (const incoming of data) {
    const parsed = parseDates<Task>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.tasks.get(parsed.id) : null;
    
    if (!existing) {
      await db.tasks.add(omitId(parsed) as Task);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.tasks.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importNotes(data: NonNullable<ExportFile['data']['notes']>) {
  let imported = 0;
  let skipped = 0;

  // Import collections
  for (const incoming of data.collections) {
    const parsed = parseDates<NoteCollection>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.noteCollections.get(parsed.id) : null;
    
    if (!existing) {
      await db.noteCollections.add(omitId(parsed) as NoteCollection);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.noteCollections.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  // Import folders
  for (const incoming of data.folders) {
    const parsed = parseDates<NoteFolder>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.noteFolders.get(parsed.id) : null;
    
    if (!existing) {
      await db.noteFolders.add(omitId(parsed) as NoteFolder);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.noteFolders.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  // Import notes
  for (const incoming of data.notes) {
    const parsed = parseDates<Note>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.notes.get(parsed.id) : null;
    
    if (!existing) {
      await db.notes.add(omitId(parsed) as Note);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.notes.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importDatabase(data: NonNullable<ExportFile['data']['database']>) {
  let imported = 0;
  let skipped = 0;

  // Import connections
  for (const incoming of data.connections) {
    const parsed = parseDates<DatabaseConnection>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.databaseConnections.get(parsed.id) : null;
    
    if (!existing) {
      await db.databaseConnections.add(omitId(parsed) as DatabaseConnection);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.databaseConnections.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  // Import query history
  for (const incoming of data.queryHistory) {
    const parsed = parseDates<QueryHistoryEntry>(incoming, HISTORY_DATE_FIELDS);
    const existing = parsed.id ? await db.queryHistory.get(parsed.id) : null;
    
    if (!existing) {
      await db.queryHistory.add(omitId(parsed) as QueryHistoryEntry);
      imported++;
    } else if (isNewer(parsed.executedAt, existing.executedAt)) {
      await db.queryHistory.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importWhiteboards(data: NonNullable<ExportFile['data']['whiteboards']>) {
  let imported = 0;
  let skipped = 0;

  // Import collections
  for (const incoming of data.collections) {
    const parsed = parseDates<WhiteboardCollection>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.whiteboardCollections.get(parsed.id) : null;
    
    if (!existing) {
      await db.whiteboardCollections.add(omitId(parsed) as WhiteboardCollection);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.whiteboardCollections.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  // Import folders
  for (const incoming of data.folders) {
    const parsed = parseDates<WhiteboardFolder>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.whiteboardFolders.get(parsed.id) : null;
    
    if (!existing) {
      await db.whiteboardFolders.add(omitId(parsed) as WhiteboardFolder);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.whiteboardFolders.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  // Import whiteboards
  for (const incoming of data.whiteboards) {
    const parsed = parseDates<Whiteboard>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.whiteboards.get(parsed.id) : null;
    
    if (!existing) {
      await db.whiteboards.add(omitId(parsed) as Whiteboard);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.whiteboards.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importBookmarks(data: NonNullable<ExportFile['data']['bookmarks']>) {
  let imported = 0;
  let skipped = 0;

  // Import categories
  for (const incoming of data.categories) {
    const parsed = parseDates<BookmarkCategory>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.bookmarkCategories.get(parsed.id) : null;
    
    if (!existing) {
      await db.bookmarkCategories.add(omitId(parsed) as BookmarkCategory);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.bookmarkCategories.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  // Import bookmarks
  for (const incoming of data.bookmarks) {
    const parsed = parseDates<Bookmark>(incoming, COMMON_DATE_FIELDS);
    const existing = parsed.id ? await db.bookmarks.get(parsed.id) : null;
    
    if (!existing) {
      await db.bookmarks.add(omitId(parsed) as Bookmark);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.bookmarks.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importKeepass(data: NonNullable<ExportFile['data']['keepass']>) {
  let imported = 0;
  let skipped = 0;

  // Import databases - convert base64 back to ArrayBuffer
  for (const incoming of data.databases) {
    const parsedDates = parseDates(incoming, KEEPASS_DATE_FIELDS);
    const parsed: KeePassDatabase = {
      ...parsedDates,
      fileData: base64ToArrayBuffer(incoming.fileData),
      keyFileData: incoming.keyFileData ? base64ToArrayBuffer(incoming.keyFileData) : undefined,
    };
    
    const existing = parsed.id ? await db.keepassDatabases.get(parsed.id) : null;
    
    if (!existing) {
      await db.keepassDatabases.add(omitId(parsed) as KeePassDatabase);
      imported++;
    } else if (isNewer(parsed.updatedAt, existing.updatedAt)) {
      await db.keepassDatabases.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  // Import quick unlock sessions - convert base64 back to ArrayBuffer
  for (const incoming of data.quickUnlockSessions as SerializedQuickUnlockSession[]) {
    const parsedDates = parseDates(incoming, KEEPASS_DATE_FIELDS);
    const parsed: QuickUnlockSession = {
      ...parsedDates,
      encryptedPassword: base64ToArrayBuffer(incoming.encryptedPassword),
      salt: base64ToArrayBuffer(incoming.salt),
      iv: base64ToArrayBuffer(incoming.iv),
    };
    
    const existing = parsed.id ? await db.quickUnlockSessions.get(parsed.id) : null;
    
    if (!existing) {
      await db.quickUnlockSessions.add(omitId(parsed) as QuickUnlockSession);
      imported++;
    } else if (isNewer(parsed.createdAt, existing.createdAt)) {
      await db.quickUnlockSessions.put(parsed);
      imported++;
    } else {
      skipped++;
    }
  }

  return { imported, skipped };
}

/**
 * Read a file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
