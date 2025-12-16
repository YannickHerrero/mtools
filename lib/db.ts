import Dexie, { type EntityTable } from 'dexie';
import type { Collection, Folder, SavedRequest, RequestHistory } from './api-client/types';
import type { Task } from './tasks/types';
import type { Note, NoteCollection, NoteFolder } from './notes/types';

const db = new Dexie('mtools') as Dexie & {
  collections: EntityTable<Collection, 'id'>;
  folders: EntityTable<Folder, 'id'>;
  savedRequests: EntityTable<SavedRequest, 'id'>;
  requestHistory: EntityTable<RequestHistory, 'id'>;
  tasks: EntityTable<Task, 'id'>;
  noteCollections: EntityTable<NoteCollection, 'id'>;
  noteFolders: EntityTable<NoteFolder, 'id'>;
  notes: EntityTable<Note, 'id'>;
};

db.version(1).stores({
  collections: '++id, name, createdAt, updatedAt',
  folders: '++id, collectionId, parentFolderId, name, createdAt, updatedAt',
  savedRequests: '++id, collectionId, folderId, name, method, url, createdAt, updatedAt',
  requestHistory: '++id, method, url, executedAt',
});

db.version(2).stores({
  collections: '++id, name, createdAt, updatedAt',
  folders: '++id, collectionId, parentFolderId, name, createdAt, updatedAt',
  savedRequests: '++id, collectionId, folderId, name, method, url, createdAt, updatedAt',
  requestHistory: '++id, method, url, executedAt',
  tasks: '++id, status, order, createdAt, updatedAt',
});

db.version(3).stores({
  collections: '++id, name, createdAt, updatedAt',
  folders: '++id, collectionId, parentFolderId, name, createdAt, updatedAt',
  savedRequests: '++id, collectionId, folderId, name, method, url, createdAt, updatedAt',
  requestHistory: '++id, method, url, executedAt',
  tasks: '++id, status, order, createdAt, updatedAt',
  noteCollections: '++id, name, isInbox, createdAt, updatedAt',
  noteFolders: '++id, collectionId, parentFolderId, name, createdAt, updatedAt',
  notes: '++id, collectionId, folderId, title, createdAt, updatedAt',
});

// Version 4: Update notes schema to use content instead of blocks
db.version(4).stores({
  collections: '++id, name, createdAt, updatedAt',
  folders: '++id, collectionId, parentFolderId, name, createdAt, updatedAt',
  savedRequests: '++id, collectionId, folderId, name, method, url, createdAt, updatedAt',
  requestHistory: '++id, method, url, executedAt',
  tasks: '++id, status, order, createdAt, updatedAt',
  noteCollections: '++id, name, isInbox, createdAt, updatedAt',
  noteFolders: '++id, collectionId, parentFolderId, name, createdAt, updatedAt',
  notes: '++id, collectionId, folderId, title, content, createdAt, updatedAt',
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

// Ensure the Inbox collection exists (and clean up duplicates)
export async function ensureInboxCollection(): Promise<number> {
  const allCollections = await db.noteCollections.toArray();
  
  // Find all Inbox collections (by flag or by name)
  const inboxCollections = allCollections.filter(
    c => c.isInbox === true || c.name === 'Inbox'
  );
  
  if (inboxCollections.length > 1) {
    // Clean up duplicates - keep the first one, delete others
    const [keepInbox, ...duplicates] = inboxCollections;
    for (const duplicate of duplicates) {
      if (duplicate.id) {
        // Move notes from duplicate to the kept inbox
        await db.notes
          .where('collectionId')
          .equals(duplicate.id)
          .modify({ collectionId: keepInbox.id! });
        
        // Move folders from duplicate to the kept inbox
        await db.noteFolders
          .where('collectionId')
          .equals(duplicate.id)
          .modify({ collectionId: keepInbox.id! });
        
        // Delete the duplicate collection
        await db.noteCollections.delete(duplicate.id);
      }
    }
    
    // Ensure the kept one has the isInbox flag
    if (keepInbox.id && !keepInbox.isInbox) {
      await db.noteCollections.update(keepInbox.id, { isInbox: true });
    }
    
    return keepInbox.id!;
  }
  
  if (inboxCollections.length === 1) {
    const inbox = inboxCollections[0];
    // Ensure it has the isInbox flag
    if (inbox.id && !inbox.isInbox) {
      await db.noteCollections.update(inbox.id, { isInbox: true });
    }
    return inbox.id!;
  }
  
  // No inbox exists, create one
  const now = new Date();
  const id = await db.noteCollections.add({
    name: 'Inbox',
    isInbox: true,
    createdAt: now,
    updatedAt: now,
  } as NoteCollection) as number;
  
  return id;
}

export { db };
