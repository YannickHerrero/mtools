export interface Whiteboard {
  id?: number;
  collectionId: number;
  folderId?: number;
  title: string;
  data: string; // JSON stringified Excalidraw elements + appState
  createdAt: Date;
  updatedAt: Date;
}

export interface WhiteboardCollection {
  id?: number;
  name: string;
  isInbox?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhiteboardFolder {
  id?: number;
  collectionId: number;
  parentFolderId?: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Export/Import types
export interface ExportedWhiteboard {
  title: string;
  data: string;
}

export interface ExportedWhiteboardFolder {
  name: string;
  folders: ExportedWhiteboardFolder[];
  whiteboards: ExportedWhiteboard[];
}

export interface ExportedWhiteboardCollection {
  version: string;
  exportedAt: string;
  collection: {
    name: string;
    folders: ExportedWhiteboardFolder[];
    whiteboards: ExportedWhiteboard[];
  };
}
