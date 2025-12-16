"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Pencil,
  FolderPlus,
  FilePlus,
  Download,
  Upload,
} from "lucide-react";
import { db } from "@/lib/db";
import type {
  NoteCollection,
  NoteFolder,
  Note,
  ExportedNoteCollection,
  ExportedNoteFolder,
} from "@/lib/notes/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotesSidebarProps {
  onLoadNote: (note: Note) => void;
  currentNoteId?: number;
  searchQuery: string;
}

const STORAGE_KEY_COLLECTIONS = "notes-sidebar-expanded-collections";
const STORAGE_KEY_FOLDERS = "notes-sidebar-expanded-folders";

export function NotesSidebar({ onLoadNote, currentNoteId, searchQuery }: NotesSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingId, setEditingId] = useState<{ type: "collection" | "folder" | "note"; id: number } | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedCollections, setExpandedCollections] = useState<Set<number>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const hasInitialized = useRef(false);

  const collections = useLiveQuery(() => db.noteCollections.toArray());
  const folders = useLiveQuery(() => db.noteFolders.toArray());
  const notes = useLiveQuery(() => db.notes.toArray());

  // Load expanded state from localStorage on initial mount
  useEffect(() => {
    if (hasInitialized.current) return;
    
    try {
      const savedCollections = localStorage.getItem(STORAGE_KEY_COLLECTIONS);
      const savedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS);
      
      if (savedCollections || savedFolders) {
        // Restore saved state
        if (savedCollections) {
          setExpandedCollections(new Set(JSON.parse(savedCollections)));
        }
        if (savedFolders) {
          setExpandedFolders(new Set(JSON.parse(savedFolders)));
        }
        hasInitialized.current = true;
      } else if (collections && folders) {
        // First time: expand all collections and folders
        const allCollectionIds = collections.map((c) => c.id).filter((id): id is number => id !== undefined);
        const allFolderIds = folders.map((f) => f.id).filter((id): id is number => id !== undefined);
        
        setExpandedCollections(new Set(allCollectionIds));
        setExpandedFolders(new Set(allFolderIds));
        hasInitialized.current = true;
      }
    } catch {
      // If localStorage fails, just expand all
      if (collections && folders) {
        const allCollectionIds = collections.map((c) => c.id).filter((id): id is number => id !== undefined);
        const allFolderIds = folders.map((f) => f.id).filter((id): id is number => id !== undefined);
        
        setExpandedCollections(new Set(allCollectionIds));
        setExpandedFolders(new Set(allFolderIds));
        hasInitialized.current = true;
      }
    }
  }, [collections, folders]);

  // Save expanded collections to localStorage when it changes
  useEffect(() => {
    if (!hasInitialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify([...expandedCollections]));
    } catch {
      // Ignore localStorage errors
    }
  }, [expandedCollections]);

  // Save expanded folders to localStorage when it changes
  useEffect(() => {
    if (!hasInitialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify([...expandedFolders]));
    } catch {
      // Ignore localStorage errors
    }
  }, [expandedFolders]);

  // Filter notes based on search query
  const filteredNotes = notes?.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;
    const now = new Date();
    await db.noteCollections.add({
      name: newCollectionName.trim(),
      createdAt: now,
      updatedAt: now,
    });
    setNewCollectionName("");
    setIsCreating(false);
  };

  const createFolder = async (collectionId: number, parentFolderId?: number) => {
    const now = new Date();
    await db.noteFolders.add({
      collectionId,
      parentFolderId,
      name: "New Folder",
      createdAt: now,
      updatedAt: now,
    });
    setExpandedCollections((prev) => new Set([...prev, collectionId]));
    if (parentFolderId) {
      setExpandedFolders((prev) => new Set([...prev, parentFolderId]));
    }
  };

  const createNote = async (collectionId: number, folderId?: number) => {
    const now = new Date();
    const newNote = {
      collectionId,
      folderId,
      title: "Untitled",
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.notes.add(newNote);
    setExpandedCollections((prev) => new Set([...prev, collectionId]));
    if (folderId) {
      setExpandedFolders((prev) => new Set([...prev, folderId]));
    }
    // Load the newly created note
    onLoadNote({ ...newNote, id: id as number });
  };

  const deleteCollection = async (id: number) => {
    // Don't delete Inbox
    const collection = collections?.find((c) => c.id === id);
    if (collection?.isInbox) {
      alert("Cannot delete Inbox collection");
      return;
    }
    await db.notes.where("collectionId").equals(id).delete();
    await db.noteFolders.where("collectionId").equals(id).delete();
    await db.noteCollections.delete(id);
  };

  const deleteFolder = async (id: number) => {
    // Delete nested notes and folders recursively
    const childFolders = folders?.filter((f) => f.parentFolderId === id) || [];
    for (const child of childFolders) {
      if (child.id) await deleteFolder(child.id);
    }
    await db.notes.where("folderId").equals(id).delete();
    await db.noteFolders.delete(id);
  };

  const deleteNote = async (id: number) => {
    await db.notes.delete(id);
  };

  const startEditing = (type: "collection" | "folder" | "note", id: number, name: string) => {
    setEditingId({ type, id });
    setEditingName(name);
  };

  const saveEditing = async () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }

    const now = new Date();
    if (editingId.type === "collection") {
      await db.noteCollections.update(editingId.id, { name: editingName.trim(), updatedAt: now });
    } else if (editingId.type === "folder") {
      await db.noteFolders.update(editingId.id, { name: editingName.trim(), updatedAt: now });
    } else {
      await db.notes.update(editingId.id, { title: editingName.trim(), updatedAt: now });
    }
    setEditingId(null);
  };

  const toggleCollection = (id: number) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleFolder = (id: number) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Export collection to JSON file
  const exportCollection = async (collectionId: number) => {
    const collection = collections?.find((c) => c.id === collectionId);
    if (!collection) return;

    const collectionFolders = folders?.filter((f) => f.collectionId === collectionId) || [];
    const collectionNotes = filteredNotes?.filter((n) => n.collectionId === collectionId) || [];

    // Helper to build nested folder structure
    const buildFolderTree = (parentFolderId?: number): ExportedNoteFolder[] => {
      return collectionFolders
        .filter((f) => f.parentFolderId === parentFolderId)
        .map((folder) => ({
          name: folder.name,
          folders: buildFolderTree(folder.id),
          notes: collectionNotes
            .filter((n) => n.folderId === folder.id)
            .map((n) => ({
              title: n.title,
              content: n.content,
            })),
        }));
    };

    const exportData: ExportedNoteCollection = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      collection: {
        name: collection.name,
        folders: buildFolderTree(undefined),
        notes: collectionNotes
          .filter((n) => !n.folderId)
          .map((n) => ({
            title: n.title,
            content: n.content,
          })),
      },
    };

    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collection.name.toLowerCase().replace(/\s+/g, "-")}-notes.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import collection from JSON file
  const importCollection = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportedNoteCollection;

      // Validate structure
      if (!data.version || !data.collection || !data.collection.name) {
        throw new Error("Invalid collection format: missing required fields");
      }

      // Check for duplicate name and generate unique name if needed
      let collectionName = data.collection.name;
      const existingNames = collections?.map((c) => c.name) || [];
      let counter = 1;
      while (existingNames.includes(collectionName)) {
        counter++;
        collectionName = `${data.collection.name} (${counter})`;
      }

      const now = new Date();

      // Create collection
      const collectionId = await db.noteCollections.add({
        name: collectionName,
        createdAt: now,
        updatedAt: now,
      }) as number;

      // Helper to import folders recursively
      const importFolders = async (
        exportedFolders: ExportedNoteFolder[],
        parentFolderId?: number
      ) => {
        for (const folder of exportedFolders) {
          const folderId = await db.noteFolders.add({
            collectionId,
            parentFolderId,
            name: folder.name,
            createdAt: now,
            updatedAt: now,
          }) as number;

          // Import notes in this folder
          for (const note of folder.notes) {
            await db.notes.add({
              collectionId,
              folderId,
              title: note.title,
              content: note.content,
              createdAt: now,
              updatedAt: now,
            });
          }

          // Import nested folders
          await importFolders(folder.folders, folderId);
        }
      };

      // Import root folders
      await importFolders(data.collection.folders);

      // Import root notes (not in any folder)
      for (const note of data.collection.notes) {
        await db.notes.add({
          collectionId,
          folderId: undefined,
          title: note.title,
          content: note.content,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Expand the newly imported collection
      setExpandedCollections((prev) => new Set([...prev, collectionId]));
    } catch (error) {
      alert(`Failed to import collection: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importCollection(file);
      event.target.value = "";
    }
  };

  const getFirstLinePreview = (note: Note): string => {
    if (!note.content) return "Empty note";
    const firstLine = note.content.split('\n')[0];
    return firstLine.slice(0, 50) + (firstLine.length > 50 ? "..." : "");
  };

  const renderFolder = (folder: NoteFolder, depth: number = 1) => {
    const isExpanded = expandedFolders.has(folder.id!);
    const childFolders = folders?.filter((f) => f.parentFolderId === folder.id) || [];
    const folderNotes = filteredNotes?.filter((n) => n.folderId === folder.id) || [];
    const isEditing = editingId?.type === "folder" && editingId.id === folder.id;

    return (
      <div key={folder.id} className="w-full">
        <Collapsible open={isExpanded} onOpenChange={() => toggleFolder(folder.id!)}>
          <div
            className="flex items-center gap-1 py-1 px-2 hover:bg-accent rounded-sm group"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                <ChevronRight
                  className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")}
                />
              </Button>
            </CollapsibleTrigger>
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}
            {isEditing ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={saveEditing}
                onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                className="h-6 text-sm flex-1"
                autoFocus
              />
            ) : (
              <span className="text-sm truncate flex-1">{folder.name}</span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => createNote(folder.collectionId, folder.id)}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Add Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createFolder(folder.collectionId, folder.id)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => startEditing("folder", folder.id!, folder.name)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => deleteFolder(folder.id!)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CollapsibleContent>
            {childFolders.map((f) => renderFolder(f, depth + 1))}
            {folderNotes.map((note) => renderNote(note, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const renderNote = (note: Note, depth: number = 1) => {
    const isActive = currentNoteId === note.id;
    const isEditing = editingId?.type === "note" && editingId.id === note.id;

    return (
      <div
        key={note.id}
        className={cn(
          "flex flex-col gap-0.5 py-1 px-2 hover:bg-accent rounded-sm group cursor-pointer",
          isActive && "bg-accent"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => !isEditing && onLoadNote(note)}
      >
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {isEditing ? (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={saveEditing}
              onKeyDown={(e) => e.key === "Enter" && saveEditing()}
              onClick={(e) => e.stopPropagation()}
              className="h-6 text-sm flex-1"
              autoFocus
            />
          ) : (
            <span className="text-sm truncate flex-1">{note.title}</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => startEditing("note", note.id!, note.title)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => deleteNote(note.id!)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!isEditing && (
          <span className="text-xs text-muted-foreground truncate ml-5">
            {getFirstLinePreview(note)}
          </span>
        )}
      </div>
    );
  };

  const renderCollection = (collection: NoteCollection) => {
    const isExpanded = expandedCollections.has(collection.id!);
    const collectionFolders = folders?.filter(
      (f) => f.collectionId === collection.id && !f.parentFolderId
    ) || [];
    const rootNotes = filteredNotes?.filter(
      (n) => n.collectionId === collection.id && !n.folderId
    ) || [];
    const isEditing = editingId?.type === "collection" && editingId.id === collection.id;

    return (
      <div key={collection.id} className="w-full">
        <Collapsible open={isExpanded} onOpenChange={() => toggleCollection(collection.id!)}>
          <div className="flex items-center gap-1 py-1 px-2 hover:bg-accent rounded-sm group">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                <ChevronRight
                  className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")}
                />
              </Button>
            </CollapsibleTrigger>
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}
            {isEditing ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={saveEditing}
                onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                className="h-6 text-sm flex-1"
                autoFocus
              />
            ) : (
              <span className="text-sm font-medium truncate flex-1">{collection.name}</span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => createNote(collection.id!)}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Add Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createFolder(collection.id!)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!collection.isInbox && (
                  <>
                    <DropdownMenuItem onClick={() => startEditing("collection", collection.id!, collection.name)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportCollection(collection.id!)}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteCollection(collection.id!)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CollapsibleContent>
            {collectionFolders.map((f) => renderFolder(f))}
            {rootNotes.map((n) => renderNote(n))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <input
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
        id="import-note-collection-input"
      />
      <div className="p-2 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Collections</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsCreating(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Collection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => document.getElementById("import-note-collection-input")?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import Collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isCreating && (
          <div className="flex gap-2">
            <Input
              placeholder="Collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCollection()}
              className="h-8 text-sm"
              autoFocus
            />
            <Button size="sm" onClick={createCollection}>
              Add
            </Button>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {collections?.map((collection) => renderCollection(collection))}
          {(!collections || collections.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No collections yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
