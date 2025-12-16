"use client";

import { useState } from "react";
import { Loader2, KeyRound, File } from "lucide-react";
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
import type { KeePassDatabase } from "@/lib/keepass/types";

interface UnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: KeePassDatabase | null;
  onUnlock: (password: string, keyFileData?: ArrayBuffer) => Promise<void>;
}

export function UnlockDialog({
  open,
  onOpenChange,
  database,
  onUnlock,
}: UnlockDialogProps) {
  const [password, setPassword] = useState("");
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    if (!password) return;

    setUnlocking(true);
    setError(null);

    try {
      let keyFileData: ArrayBuffer | undefined;
      if (keyFile) {
        keyFileData = await keyFile.arrayBuffer();
      } else if (database?.keyFileData) {
        // Use stored key file if available
        keyFileData = database.keyFileData;
      }

      await onUnlock(password, keyFileData);
      
      // Reset form on success
      setPassword("");
      setKeyFile(null);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to unlock database:", err);
      setError(
        err instanceof Error
          ? err.message.includes("Invalid")
            ? "Invalid password or key file"
            : err.message
          : "Failed to unlock database"
      );
    } finally {
      setUnlocking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && password && !unlocking) {
      handleUnlock();
    }
  };

  const handleKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setKeyFile(file || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Unlock Database
          </DialogTitle>
          <DialogDescription>
            {database
              ? `Enter the password to unlock "${database.name}"`
              : "Enter your password to unlock the database"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter master password"
              autoFocus
              disabled={unlocking}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="keyfile">Key File (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="keyfile"
                type="file"
                onChange={handleKeyFileChange}
                disabled={unlocking}
                className="flex-1"
              />
              {database?.keyFileName && !keyFile && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <File className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">{database.keyFileName}</span>
                </div>
              )}
            </div>
            {database?.keyFileName && (
              <p className="text-xs text-muted-foreground">
                A key file is stored with this database. Upload a new one to override.
              </p>
            )}
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
            disabled={unlocking}
          >
            Cancel
          </Button>
          <Button onClick={handleUnlock} disabled={!password || unlocking}>
            {unlocking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unlocking...
              </>
            ) : (
              "Unlock"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
