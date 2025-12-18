import type { Collection, Folder, SavedRequest, RequestHistory } from '../api-client/types';
import type { Task } from '../tasks/types';
import type { Note, NoteCollection, NoteFolder } from '../notes/types';
import type { DatabaseConnection, QueryHistoryEntry } from '../database/types';
import type { Whiteboard, WhiteboardCollection, WhiteboardFolder } from '../whiteboard/types';
import type { Bookmark, BookmarkCategory } from '../bookmarks/types';
import type { KeePassDatabase, QuickUnlockSession } from '../keepass/types';

export const EXPORT_VERSION = '1.0';
export const EXPORT_MAGIC = 'MTOOLS_EXPORT';

// Modules available for export
export type ExportModule = 
  | 'apiClient'
  | 'tasks'
  | 'notes'
  | 'database'
  | 'whiteboards'
  | 'bookmarks'
  | 'keepass';

export const EXPORT_MODULES: Record<ExportModule, { label: string; description: string }> = {
  apiClient: { 
    label: 'API Client', 
    description: 'Collections, saved requests, and request history' 
  },
  tasks: { 
    label: 'Tasks', 
    description: 'All tasks from the kanban board' 
  },
  notes: { 
    label: 'Notes', 
    description: 'Note collections, folders, and notes' 
  },
  database: { 
    label: 'Database Connections', 
    description: 'Saved database connections and query history' 
  },
  whiteboards: { 
    label: 'Whiteboards', 
    description: 'Whiteboard collections, folders, and drawings' 
  },
  bookmarks: { 
    label: 'Bookmarks', 
    description: 'Bookmark categories and saved links' 
  },
  keepass: { 
    label: 'KeePass', 
    description: 'KeePass database files (encrypted)' 
  },
};

// Serialized versions with ArrayBuffer converted to base64
export interface SerializedKeePassDatabase extends Omit<KeePassDatabase, 'fileData' | 'keyFileData'> {
  fileData: string; // base64
  keyFileData?: string; // base64
}

export interface SerializedQuickUnlockSession extends Omit<QuickUnlockSession, 'encryptedPassword' | 'salt' | 'iv'> {
  encryptedPassword: string; // base64
  salt: string; // base64
  iv: string; // base64
}

// Export data structure
export interface ExportData {
  apiClient?: {
    collections: Collection[];
    folders: Folder[];
    savedRequests: SavedRequest[];
    requestHistory: RequestHistory[];
  };
  tasks?: Task[];
  notes?: {
    collections: NoteCollection[];
    folders: NoteFolder[];
    notes: Note[];
  };
  database?: {
    connections: DatabaseConnection[];
    queryHistory: QueryHistoryEntry[];
  };
  whiteboards?: {
    collections: WhiteboardCollection[];
    folders: WhiteboardFolder[];
    whiteboards: Whiteboard[];
  };
  bookmarks?: {
    categories: BookmarkCategory[];
    bookmarks: Bookmark[];
  };
  keepass?: {
    databases: SerializedKeePassDatabase[];
    quickUnlockSessions: SerializedQuickUnlockSession[];
  };
}

// Full export file structure (before encryption)
export interface ExportFile {
  magic: typeof EXPORT_MAGIC;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  modules: ExportModule[];
  data: ExportData;
}

// Encrypted export file structure
export interface EncryptedExportFile {
  magic: typeof EXPORT_MAGIC;
  version: typeof EXPORT_VERSION;
  encrypted: true;
  salt: string; // base64
  iv: string; // base64
  data: string; // base64 encrypted data
}

// Import result
export interface ImportResult {
  success: boolean;
  modules: {
    module: ExportModule;
    imported: number;
    skipped: number;
    errors: string[];
  }[];
  totalImported: number;
  totalSkipped: number;
  errors: string[];
}

// Export options
export interface ExportOptions {
  modules: ExportModule[];
  password: string;
}

// Import options
export interface ImportOptions {
  password: string;
}
