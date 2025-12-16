"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { FolderPlus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/db";
import type { RequestState } from "@/lib/api-client/types";

interface SaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestState;
  onSaved: (savedRequest: { id: number; name: string; collectionId: number; folderId?: number }) => void;
  existingRequestId?: number;
  existingName?: string;
  existingCollectionId?: number;
  existingFolderId?: number;
}

// Inner component that holds form state - remounts when dialog opens to reset state
function SaveRequestDialogContent({
  onOpenChange,
  request,
  onSaved,
  existingRequestId,
  existingName,
  existingCollectionId,
  existingFolderId,
}: Omit<SaveRequestDialogProps, "open">) {
  const [name, setName] = useState(existingName || "New Request");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    existingCollectionId?.toString() || ""
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    existingFolderId?.toString() || "root"
  );
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const collections = useLiveQuery(() => db.collections.toArray());
  const folders = useLiveQuery(() => db.folders.toArray());

  // Get folders for selected collection
  const collectionFolders = folders?.filter(
    (f) => f.collectionId === parseInt(selectedCollectionId)
  ) || [];

  // Build folder tree for display
  const getFolderPath = (folderId: number): string => {
    const folder = folders?.find((f) => f.id === folderId);
    if (!folder) return "";
    if (folder.parentFolderId) {
      return `${getFolderPath(folder.parentFolderId)} / ${folder.name}`;
    }
    return folder.name;
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) {
      setError("Collection name is required");
      return;
    }

    const now = new Date();
    const id = await db.collections.add({
      name: newCollectionName.trim(),
      createdAt: now,
      updatedAt: now,
    });

    setSelectedCollectionId(String(id));
    setSelectedFolderId("root");
    setIsCreatingCollection(false);
    setNewCollectionName("");
    setError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Request name is required");
      return;
    }

    if (!selectedCollectionId) {
      setError("Please select a collection");
      return;
    }

    const now = new Date();
    const collectionId = parseInt(selectedCollectionId);
    const folderId = selectedFolderId === "root" ? undefined : parseInt(selectedFolderId);

    try {
      if (existingRequestId) {
        // Update existing request
        await db.savedRequests.update(existingRequestId, {
          name: name.trim(),
          collectionId,
          folderId,
          method: request.method,
          url: request.url,
          headers: request.headers,
          params: request.params,
          body: request.body,
          updatedAt: now,
        });

        onSaved({
          id: existingRequestId,
          name: name.trim(),
          collectionId,
          folderId,
        });
      } else {
        // Create new request
        const id = await db.savedRequests.add({
          name: name.trim(),
          collectionId,
          folderId,
          method: request.method,
          url: request.url,
          headers: request.headers,
          params: request.params,
          body: request.body,
          createdAt: now,
          updatedAt: now,
        });

        onSaved({
          id: id as number,
          name: name.trim(),
          collectionId,
          folderId,
        });
      }

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save request");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{existingRequestId ? "Update Request" : "Save Request"}</DialogTitle>
        <DialogDescription>
          {existingRequestId
            ? "Update the request details and location."
            : "Save this request to a collection for later use."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        {/* Request Name */}
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Request name"
          />
        </div>

        {/* Collection Selection */}
        <div className="grid gap-2">
          <Label>Collection</Label>
          {isCreatingCollection ? (
            <div className="flex gap-2">
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name"
                onKeyDown={(e) => e.key === "Enter" && createCollection()}
                autoFocus
              />
              <Button size="sm" onClick={createCollection}>
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsCreatingCollection(false);
                  setNewCollectionName("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select
                value={selectedCollectionId}
                onValueChange={(value) => {
                  setSelectedCollectionId(value);
                  setSelectedFolderId("root");
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections?.map((collection) => (
                    <SelectItem key={collection.id} value={String(collection.id)}>
                      {collection.name}
                    </SelectItem>
                  ))}
                  {(!collections || collections.length === 0) && (
                    <SelectItem value="none" disabled>
                      No collections yet
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsCreatingCollection(true)}
                title="Create new collection"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Folder Selection */}
        {selectedCollectionId && collectionFolders.length > 0 && (
          <div className="grid gap-2">
            <Label>Folder (optional)</Label>
            <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">
                  <span className="text-muted-foreground">Root (no folder)</span>
                </SelectItem>
                {collectionFolders.map((folder) => (
                  <SelectItem key={folder.id} value={String(folder.id)}>
                    <div className="flex items-center gap-2">
                      <FolderPlus className="h-4 w-4 text-muted-foreground" />
                      {folder.parentFolderId ? getFolderPath(folder.id!) : folder.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {existingRequestId ? "Update" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function SaveRequestDialog({
  open,
  onOpenChange,
  ...props
}: SaveRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {open && (
          <SaveRequestDialogContent
            onOpenChange={onOpenChange}
            {...props}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
