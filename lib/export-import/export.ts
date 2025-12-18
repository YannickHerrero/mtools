import { db } from '../db';
import { encryptWithPassword, arrayBufferToBase64 } from './crypto';
import type {
  ExportData,
  ExportFile,
  EncryptedExportFile,
  ExportOptions,
  ExportModule,
  SerializedKeePassDatabase,
  SerializedQuickUnlockSession,
} from './types';
import { EXPORT_MAGIC, EXPORT_VERSION } from './types';

/**
 * Export selected modules from the database
 */
export async function exportData(options: ExportOptions): Promise<string> {
  const { modules, password } = options;
  const data: ExportData = {};

  // Export each selected module
  for (const mod of modules) {
    switch (mod) {
      case 'apiClient':
        data.apiClient = await exportApiClient();
        break;
      case 'tasks':
        data.tasks = await exportTasks();
        break;
      case 'notes':
        data.notes = await exportNotes();
        break;
      case 'database':
        data.database = await exportDatabase();
        break;
      case 'whiteboards':
        data.whiteboards = await exportWhiteboards();
        break;
      case 'bookmarks':
        data.bookmarks = await exportBookmarks();
        break;
      case 'keepass':
        data.keepass = await exportKeepass();
        break;
    }
  }

  // Create export file structure
  const exportFile: ExportFile = {
    magic: EXPORT_MAGIC,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    modules,
    data,
  };

  // Encrypt the data
  const jsonData = JSON.stringify(exportFile);
  const encrypted = await encryptWithPassword(jsonData, password);

  // Create encrypted export file
  const encryptedFile: EncryptedExportFile = {
    magic: EXPORT_MAGIC,
    version: EXPORT_VERSION,
    encrypted: true,
    salt: encrypted.salt,
    iv: encrypted.iv,
    data: encrypted.data,
  };

  return JSON.stringify(encryptedFile, null, 2);
}

/**
 * Get count of items for each module (for UI display)
 */
export async function getModuleCounts(): Promise<Record<ExportModule, number>> {
  const [
    collections,
    folders,
    savedRequests,
    requestHistory,
    tasks,
    noteCollections,
    noteFolders,
    notes,
    databaseConnections,
    queryHistory,
    whiteboardCollections,
    whiteboardFolders,
    whiteboards,
    bookmarkCategories,
    bookmarks,
    keepassDatabases,
  ] = await Promise.all([
    db.collections.count(),
    db.folders.count(),
    db.savedRequests.count(),
    db.requestHistory.count(),
    db.tasks.count(),
    db.noteCollections.count(),
    db.noteFolders.count(),
    db.notes.count(),
    db.databaseConnections.count(),
    db.queryHistory.count(),
    db.whiteboardCollections.count(),
    db.whiteboardFolders.count(),
    db.whiteboards.count(),
    db.bookmarkCategories.count(),
    db.bookmarks.count(),
    db.keepassDatabases.count(),
  ]);

  return {
    apiClient: collections + folders + savedRequests + requestHistory,
    tasks,
    notes: noteCollections + noteFolders + notes,
    database: databaseConnections + queryHistory,
    whiteboards: whiteboardCollections + whiteboardFolders + whiteboards,
    bookmarks: bookmarkCategories + bookmarks,
    keepass: keepassDatabases,
  };
}

async function exportApiClient() {
  const [collections, folders, savedRequests, requestHistory] = await Promise.all([
    db.collections.toArray(),
    db.folders.toArray(),
    db.savedRequests.toArray(),
    db.requestHistory.toArray(),
  ]);

  return { collections, folders, savedRequests, requestHistory };
}

async function exportTasks() {
  return db.tasks.toArray();
}

async function exportNotes() {
  const [collections, folders, notes] = await Promise.all([
    db.noteCollections.toArray(),
    db.noteFolders.toArray(),
    db.notes.toArray(),
  ]);

  return { collections, folders, notes };
}

async function exportDatabase() {
  const [connections, queryHistory] = await Promise.all([
    db.databaseConnections.toArray(),
    db.queryHistory.toArray(),
  ]);

  return { connections, queryHistory };
}

async function exportWhiteboards() {
  const [collections, folders, whiteboards] = await Promise.all([
    db.whiteboardCollections.toArray(),
    db.whiteboardFolders.toArray(),
    db.whiteboards.toArray(),
  ]);

  return { collections, folders, whiteboards };
}

async function exportBookmarks() {
  const [categories, bookmarks] = await Promise.all([
    db.bookmarkCategories.toArray(),
    db.bookmarks.toArray(),
  ]);

  return { categories, bookmarks };
}

async function exportKeepass() {
  const [databases, quickUnlockSessions] = await Promise.all([
    db.keepassDatabases.toArray(),
    db.quickUnlockSessions.toArray(),
  ]);

  // Convert ArrayBuffer fields to base64
  const serializedDatabases: SerializedKeePassDatabase[] = databases.map((db) => ({
    ...db,
    fileData: arrayBufferToBase64(db.fileData),
    keyFileData: db.keyFileData ? arrayBufferToBase64(db.keyFileData) : undefined,
  }));

  const serializedSessions: SerializedQuickUnlockSession[] = quickUnlockSessions.map((session) => ({
    ...session,
    encryptedPassword: arrayBufferToBase64(session.encryptedPassword),
    salt: arrayBufferToBase64(session.salt),
    iv: arrayBufferToBase64(session.iv),
  }));

  return {
    databases: serializedDatabases,
    quickUnlockSessions: serializedSessions,
  };
}

/**
 * Download export data as a file
 */
export function downloadExport(data: string, filename?: string) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `mtools-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
