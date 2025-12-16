export interface Note {
  id?: number;
  collectionId: number;
  folderId?: number;
  title: string;
  content: string; // Raw markdown content
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteCollection {
  id?: number;
  name: string;
  isInbox?: boolean; // Special flag for the Inbox collection
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteFolder {
  id?: number;
  collectionId: number;
  parentFolderId?: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Export/Import types
export interface ExportedNote {
  title: string;
  content: string;
}

export interface ExportedNoteFolder {
  name: string;
  folders: ExportedNoteFolder[];
  notes: ExportedNote[];
}

export interface ExportedNoteCollection {
  version: string;
  exportedAt: string;
  collection: {
    name: string;
    folders: ExportedNoteFolder[];
    notes: ExportedNote[];
  };
}
