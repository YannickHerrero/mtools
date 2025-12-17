"use client";

import { useState } from "react";
import { Loader2, KeyRound, File, Info } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KeePassDatabase, QuickUnlockDuration } from "@/lib/keepass/types";
import { QUICK_UNLOCK_DURATIONS } from "@/lib/keepass/types";
import { validatePin } from "@/lib/keepass/quick-unlock";

interface UnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: KeePassDatabase | null;
  onUnlock: (
    password: string,
    keyFileData?: ArrayBuffer,
    quickUnlockOptions?: { pin: string; duration: QuickUnlockDuration }
  ) => Promise<void>;
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

  // Quick unlock state
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [duration, setDuration] = useState<QuickUnlockDuration>("1_week");
  const [pinError, setPinError] = useState<string | null>(null);

  const validatePinInput = (): boolean => {
    if (!keepLoggedIn) return true;

    const validation = validatePin(pin);
    if (!validation.valid) {
      setPinError(validation.error || "Invalid PIN");
      return false;
    }

    if (pin !== confirmPin) {
      setPinError("PINs do not match");
      return false;
    }

    setPinError(null);
    return true;
  };

  const handleUnlock = async () => {
    if (!password) return;

    if (!validatePinInput()) return;

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

      const quickUnlockOptions = keepLoggedIn
        ? { pin, duration }
        : undefined;

      await onUnlock(password, keyFileData, quickUnlockOptions);

      // Reset form on success
      resetForm();
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

  const resetForm = () => {
    setPassword("");
    setKeyFile(null);
    setKeepLoggedIn(false);
    setPin("");
    setConfirmPin("");
    setDuration("1_week");
    setError(null);
    setPinError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && password && !unlocking) {
      // Don't submit if keep logged in is enabled but PIN fields are incomplete
      if (keepLoggedIn && (!pin || !confirmPin || pin !== confirmPin)) {
        return;
      }
      handleUnlock();
    }
  };

  const handleKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setKeyFile(file || null);
  };

  const handlePinChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setPin(digitsOnly);
    setPinError(null);
  };

  const handleConfirmPinChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setConfirmPin(digitsOnly);
    setPinError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[450px]">
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

          {/* Keep Me Logged In Section */}
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="keepLoggedIn"
                checked={keepLoggedIn}
                onCheckedChange={(checked) => {
                  setKeepLoggedIn(checked === true);
                  if (!checked) {
                    setPin("");
                    setConfirmPin("");
                    setPinError(null);
                  }
                }}
                disabled={unlocking}
              />
              <Label
                htmlFor="keepLoggedIn"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                Keep me logged in
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px]">
                      <p>
                        Set a PIN to quickly unlock this database without entering your master password.
                        Your password will be encrypted and stored locally.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>

            {keepLoggedIn && (
              <div className="mt-4 space-y-4 pl-6 border-l-2 border-muted">
                <div className="grid gap-2">
                  <Label htmlFor="pin">PIN (4-6 digits)</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter PIN"
                    disabled={unlocking}
                    maxLength={6}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmPin">Confirm PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={confirmPin}
                    onChange={(e) => handleConfirmPinChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Confirm PIN"
                    disabled={unlocking}
                    maxLength={6}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="duration">Stay logged in for</Label>
                  <Select
                    value={duration}
                    onValueChange={(value) => setDuration(value as QuickUnlockDuration)}
                    disabled={unlocking}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUICK_UNLOCK_DURATIONS).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {pinError && (
                  <div className="text-sm text-destructive">
                    {pinError}
                  </div>
                )}
              </div>
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
          <Button
            onClick={handleUnlock}
            disabled={!password || unlocking || (keepLoggedIn && (!pin || !confirmPin))}
          >
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
