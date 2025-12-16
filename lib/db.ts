import Dexie, { type EntityTable } from 'dexie';
import type { Collection, Folder, SavedRequest, RequestHistory } from './api-client/types';

const db = new Dexie('mtools') as Dexie & {
  collections: EntityTable<Collection, 'id'>;
  folders: EntityTable<Folder, 'id'>;
  savedRequests: EntityTable<SavedRequest, 'id'>;
  requestHistory: EntityTable<RequestHistory, 'id'>;
};

db.version(1).stores({
  collections: '++id, name, createdAt, updatedAt',
  folders: '++id, collectionId, parentFolderId, name, createdAt, updatedAt',
  savedRequests: '++id, collectionId, folderId, name, method, url, createdAt, updatedAt',
  requestHistory: '++id, method, url, executedAt',
});

// History limit - keep only the last 100 entries
const HISTORY_LIMIT = 100;

export async function addToHistory(entry: Omit<RequestHistory, 'id'>): Promise<number> {
  const id = await db.requestHistory.add(entry as RequestHistory) as number;
  
  // Clean up old entries if we exceed the limit
  const count = await db.requestHistory.count();
  if (count > HISTORY_LIMIT) {
    const excess = count - HISTORY_LIMIT;
    const oldestEntries = await db.requestHistory
      .orderBy('executedAt')
      .limit(excess)
      .primaryKeys();
    await db.requestHistory.bulkDelete(oldestEntries);
  }
  
  return id;
}

export { db };
