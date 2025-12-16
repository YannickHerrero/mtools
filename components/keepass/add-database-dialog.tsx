"use client";

import { useState, useCallback } from "react";
import { Loader2, Upload, File, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface AddDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    name: string;
    fileName: string;
    fileData: ArrayBuffer;
    keyFileName?: string;
    keyFileData?: ArrayBuffer;
  }) => Promise<void>;
}

export function AddDatabaseDialog({
  open,
  onOpenChange,
  onAdd,
}: AddDatabaseDialogProps) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      // Validate file extension
      if (!selectedFile.name.toLowerCase().endsWith(".kdbx")) {
        setError("Please select a valid KeePass database file (.kdbx)");
        return;
      }
      setFile(selectedFile);
      // Auto-fill name from filename if empty
      if (!name) {
        setName(selectedFile.name.replace(/\.kdbx$/i, ""));
      }
      setError(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  }, [name]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    handleFileChange(selectedFile || null);
  };

  const handleKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setKeyFile(selectedFile || null);
  };

  const handleSave = async () => {
    if (!file || !name) return;

    setSaving(true);
    setError(null);

    try {
      const fileData = await file.arrayBuffer();
      let keyFileData: ArrayBuffer | undefined;
      let keyFileName: string | undefined;

      if (keyFile) {
        keyFileData = await keyFile.arrayBuffer();
        keyFileName = keyFile.name;
      }

      await onAdd({
        name,
        fileName: file.name,
        fileData,
        keyFileName,
        keyFileData,
      });

      // Reset form
      setName("");
      setFile(null);
      setKeyFile(null);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to add database:", err);
      setError(
        err instanceof Error ? err.message : "Failed to add database"
      );
    } finally {
      setSaving(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const removeKeyFile = () => {
    setKeyFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add KeePass Database</DialogTitle>
          <DialogDescription>
            Upload a KeePass database file (.kdbx) to add it to your collection.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* File Drop Zone */}
          <div className="grid gap-2">
            <Label>Database File</Label>
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                )}
                onClick={() => document.getElementById("kdbx-file-input")?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drop your .kdbx file here or click to browse
                </p>
                <input
                  id="kdbx-file-input"
                  type="file"
                  accept=".kdbx"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate flex-1">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Name Input */}
          <div className="grid gap-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Passwords"
              disabled={saving}
            />
          </div>

          {/* Key File Input */}
          <div className="grid gap-2">
            <Label htmlFor="keyfile">Key File (optional)</Label>
            {!keyFile ? (
              <div className="flex items-center gap-2">
                <Input
                  id="keyfile"
                  type="file"
                  onChange={handleKeyFileChange}
                  disabled={saving}
                  className="flex-1"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate flex-1">{keyFile.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={removeKeyFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              If your database requires a key file, add it here. It will be stored securely.
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!file || !name || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Database"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
