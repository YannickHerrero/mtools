"use client";

import { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  Folder,
  FolderOpen,
  FileJson,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Pencil,
  FolderPlus,
  FilePlus,
  Download,
  Upload,
  Key,
} from "lucide-react";
import { db } from "@/lib/db";
import type { Collection, Folder as FolderType, SavedRequest, RequestState, ExportedCollection, ExportedFolder, CollectionAuth } from "@/lib/api-client/types";
import { CollectionAuthDialog } from "./collection-auth-dialog";
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

interface CollectionsSidebarProps {
  onLoadRequest: (request: RequestState & { id?: number; name?: string; collectionId?: number; folderId?: number }) => void;
  currentRequestId?: number;
}

const STORAGE_KEY_COLLECTIONS = "api-client-expanded-collections";
const STORAGE_KEY_FOLDERS = "api-client-expanded-folders";

export function CollectionsSidebar({ onLoadRequest, currentRequestId }: CollectionsSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingId, setEditingId] = useState<{ type: "collection" | "folder" | "request"; id: number } | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedCollections, setExpandedCollections] = useState<Set<number>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [authDialogState, setAuthDialogState] = useState<{ open: boolean; collectionId: number; collectionName: string; currentAuth?: CollectionAuth } | null>(null);

  const collections = useLiveQuery(() => db.collections.toArray());
  const folders = useLiveQuery(() => db.folders.toArray());
  const requests = useLiveQuery(() => db.savedRequests.toArray());

  // Track if we've done the initial load from localStorage
  const hasInitialized = useRef(false);

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
        const collectionIds = collections.map((c) => c.id!).filter(Boolean);
        const folderIds = folders.map((f) => f.id!).filter(Boolean);
        
        if (collectionIds.length > 0 || folderIds.length > 0) {
          setExpandedCollections(new Set(collectionIds));
          setExpandedFolders(new Set(folderIds));
          hasInitialized.current = true;
        }
      }
    } catch {
      // If localStorage fails, just expand all
      if (collections && folders) {
        const collectionIds = collections.map((c) => c.id!).filter(Boolean);
        const folderIds = folders.map((f) => f.id!).filter(Boolean);
        
        if (collectionIds.length > 0 || folderIds.length > 0) {
          setExpandedCollections(new Set(collectionIds));
          setExpandedFolders(new Set(folderIds));
          hasInitialized.current = true;
        }
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

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;
    const now = new Date();
    await db.collections.add({
      name: newCollectionName.trim(),
      createdAt: now,
      updatedAt: now,
    });
    setNewCollectionName("");
    setIsCreating(false);
  };

  const createFolder = async (collectionId: number, parentFolderId?: number) => {
    const now = new Date();
    await db.folders.add({
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

  const createRequest = async (collectionId: number, folderId?: number) => {
    const now = new Date();
    await db.savedRequests.add({
      collectionId,
      folderId,
      name: "New Request",
      method: "GET",
      url: "",
      headers: [],
      params: [],
      body: "",
      createdAt: now,
      updatedAt: now,
    });
    setExpandedCollections((prev) => new Set([...prev, collectionId]));
    if (folderId) {
      setExpandedFolders((prev) => new Set([...prev, folderId]));
    }
  };

  const deleteCollection = async (id: number) => {
    await db.savedRequests.where("collectionId").equals(id).delete();
    await db.folders.where("collectionId").equals(id).delete();
    await db.collections.delete(id);
  };

  const deleteFolder = async (id: number) => {
    // Delete nested requests and folders recursively
    const childFolders = folders?.filter((f) => f.parentFolderId === id) || [];
    for (const child of childFolders) {
      if (child.id) await deleteFolder(child.id);
    }
    await db.savedRequests.where("folderId").equals(id).delete();
    await db.folders.delete(id);
  };

  const deleteRequest = async (id: number) => {
    await db.savedRequests.delete(id);
  };

  const startEditing = (type: "collection" | "folder" | "request", id: number, name: string) => {
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
      await db.collections.update(editingId.id, { name: editingName.trim(), updatedAt: now });
    } else if (editingId.type === "folder") {
      await db.folders.update(editingId.id, { name: editingName.trim(), updatedAt: now });
    } else {
      await db.savedRequests.update(editingId.id, { name: editingName.trim(), updatedAt: now });
    }
    setEditingId(null);
  };

  const loadRequest = (request: SavedRequest) => {
    onLoadRequest({
      id: request.id,
      name: request.name,
      collectionId: request.collectionId,
      folderId: request.folderId,
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
      body: request.body || "",
    });
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
    const collectionRequests = requests?.filter((r) => r.collectionId === collectionId) || [];

    // Helper to build nested folder structure
    const buildFolderTree = (parentFolderId?: number): ExportedFolder[] => {
      return collectionFolders
        .filter((f) => f.parentFolderId === parentFolderId)
        .map((folder) => ({
          name: folder.name,
          folders: buildFolderTree(folder.id),
          requests: collectionRequests
            .filter((r) => r.folderId === folder.id)
            .map((r) => ({
              name: r.name,
              method: r.method,
              url: r.url,
              headers: r.headers.map(({ key, value, enabled }) => ({ key, value, enabled })),
              params: r.params.map(({ key, value, enabled }) => ({ key, value, enabled })),
              body: r.body,
            })),
        }));
    };

    const exportData: ExportedCollection = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      collection: {
        name: collection.name,
        auth: collection.auth,
        folders: buildFolderTree(undefined),
        requests: collectionRequests
          .filter((r) => !r.folderId)
          .map((r) => ({
            name: r.name,
            method: r.method,
            url: r.url,
            headers: r.headers.map(({ key, value, enabled }) => ({ key, value, enabled })),
            params: r.params.map(({ key, value, enabled }) => ({ key, value, enabled })),
            body: r.body,
          })),
      },
    };

    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collection.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import collection from JSON file
  const importCollection = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportedCollection;

      // Validate structure
      if (!data.version || !data.collection || !data.collection.name) {
        throw new Error("Invalid collection format: missing required fields");
      }
      if (!Array.isArray(data.collection.folders) || !Array.isArray(data.collection.requests)) {
        throw new Error("Invalid collection format: folders and requests must be arrays");
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
      const collectionId = await db.collections.add({
        name: collectionName,
        auth: data.collection.auth,
        createdAt: now,
        updatedAt: now,
      }) as number;

      // Helper to import folders recursively
      const importFolders = async (
        exportedFolders: ExportedFolder[],
        parentFolderId?: number
      ) => {
        for (const folder of exportedFolders) {
          const folderId = await db.folders.add({
            collectionId,
            parentFolderId,
            name: folder.name,
            createdAt: now,
            updatedAt: now,
          }) as number;

          // Import requests in this folder
          for (const request of folder.requests) {
            await db.savedRequests.add({
              collectionId,
              folderId,
              name: request.name,
              method: request.method,
              url: request.url,
              headers: request.headers.map((h) => ({ ...h, id: crypto.randomUUID() })),
              params: request.params.map((p) => ({ ...p, id: crypto.randomUUID() })),
              body: request.body,
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

      // Import root requests (not in any folder)
      for (const request of data.collection.requests) {
        await db.savedRequests.add({
          collectionId,
          folderId: undefined,
          name: request.name,
          method: request.method,
          url: request.url,
          headers: request.headers.map((h) => ({ ...h, id: crypto.randomUUID() })),
          params: request.params.map((p) => ({ ...p, id: crypto.randomUUID() })),
          body: request.body,
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
      // Reset the input so the same file can be imported again if needed
      event.target.value = "";
    }
  };

  const renderFolder = (folder: FolderType, depth: number = 1) => {
    const isExpanded = expandedFolders.has(folder.id!);
    const childFolders = folders?.filter((f) => f.parentFolderId === folder.id) || [];
    const folderRequests = requests?.filter((r) => r.folderId === folder.id) || [];
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
                <DropdownMenuItem onClick={() => createRequest(folder.collectionId, folder.id)}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Add Request
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
            {folderRequests.map((request) => renderRequest(request, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const renderRequest = (request: SavedRequest, depth: number = 1) => {
    const isActive = currentRequestId === request.id;
    const isEditing = editingId?.type === "request" && editingId.id === request.id;
    const methodColors: Record<string, string> = {
      GET: "text-green-500",
      POST: "text-blue-500",
      PUT: "text-orange-500",
      PATCH: "text-yellow-500",
      DELETE: "text-red-500",
      HEAD: "text-purple-500",
      OPTIONS: "text-gray-500",
    };

    return (
      <div
        key={request.id}
        className={cn(
          "flex items-center gap-1 py-1 px-2 hover:bg-accent rounded-sm group cursor-pointer",
          isActive && "bg-accent"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => !isEditing && loadRequest(request)}
      >
        <FileJson className="h-4 w-4 text-muted-foreground" />
        <span className={cn("text-xs font-mono", methodColors[request.method])}>
          {request.method.substring(0, 3)}
        </span>
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
          <span className="text-sm truncate flex-1">{request.name}</span>
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
            <DropdownMenuItem onClick={() => startEditing("request", request.id!, request.name)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteRequest(request.id!)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderCollection = (collection: Collection) => {
    const isExpanded = expandedCollections.has(collection.id!);
    const collectionFolders = folders?.filter(
      (f) => f.collectionId === collection.id && !f.parentFolderId
    ) || [];
    const rootRequests = requests?.filter(
      (r) => r.collectionId === collection.id && !r.folderId
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
                <DropdownMenuItem onClick={() => createRequest(collection.id!)}>
                  <FilePlus className="h-4 w-4 mr-2" />
                  Add Request
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createFolder(collection.id!)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => startEditing("collection", collection.id!, collection.name)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAuthDialogState({ open: true, collectionId: collection.id!, collectionName: collection.name, currentAuth: collection.auth })}>
                  <Key className="h-4 w-4 mr-2" />
                  Authorization
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CollapsibleContent>
            {collectionFolders.map((f) => renderFolder(f))}
            {rootRequests.map((r) => renderRequest(r))}
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
        id="import-collection-input"
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
              <DropdownMenuItem onClick={() => document.getElementById("import-collection-input")?.click()}>
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

      {authDialogState && (
        <CollectionAuthDialog
          open={authDialogState.open}
          onOpenChange={(open) => !open && setAuthDialogState(null)}
          collectionId={authDialogState.collectionId}
          collectionName={authDialogState.collectionName}
          currentAuth={authDialogState.currentAuth}
        />
      )}
    </div>
  );
}
