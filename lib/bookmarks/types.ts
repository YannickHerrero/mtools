export interface Bookmark {
  id?: number;
  categoryId: number;
  title: string;
  url: string;
  description?: string;
  favicon?: string; // URL or data URL for favicon
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookmarkCategory {
  id?: number;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Export/Import types
export interface ExportedBookmark {
  title: string;
  url: string;
  description?: string;
  favicon?: string;
  order: number;
}

export interface ExportedCategory {
  name: string;
  order: number;
  bookmarks: ExportedBookmark[];
}

export interface ExportedBookmarks {
  version: string;
  exportedAt: string;
  categories: ExportedCategory[];
}
