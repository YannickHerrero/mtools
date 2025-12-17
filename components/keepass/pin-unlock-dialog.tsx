"use client";

import { useState, useEffect } from "react";
import { Loader2, KeyRound, Clock, AlertTriangle } from "lucide-react";
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
import { QUICK_UNLOCK_MAX_ATTEMPTS } from "@/lib/keepass/types";
import { getQuickUnlockSessionInfo } from "@/lib/keepass/quick-unlock";

interface PinUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: KeePassDatabase | null;
  onUnlockWithPin: (pin: string) => Promise<void>;
  onUseMasterPassword: () => void;
}

export function PinUnlockDialog({
  open,
  onOpenChange,
  database,
  onUnlockWithPin,
  onUseMasterPassword,
}: PinUnlockDialogProps) {
  const [pin, setPin] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ 
    expiresAt: Date; 
    failedAttempts: number 
  } | null>(null);

  // Load session info when dialog opens
  useEffect(() => {
    if (open && database?.id) {
      getQuickUnlockSessionInfo(database.id).then(setSessionInfo);
    }
  }, [open, database?.id]);

  const handleUnlock = async () => {
    if (!pin || pin.length < 4) {
      setError("Please enter your PIN");
      return;
    }

    setUnlocking(true);
    setError(null);

    try {
      await onUnlockWithPin(pin);
      // Reset form on success
      setPin("");
      setError(null);
    } catch (err) {
      console.error("Failed to unlock with PIN:", err);
      setError(err instanceof Error ? err.message : "Failed to unlock");
      // Refresh session info to show updated attempt count
      if (database?.id) {
        const info = await getQuickUnlockSessionInfo(database.id);
        setSessionInfo(info);
      }
    } finally {
      setUnlocking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length >= 4 && !unlocking) {
      handleUnlock();
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow digits, max 6
    const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    setPin(digitsOnly);
    setError(null);
  };

  const handleUseMasterPassword = () => {
    setPin("");
    setError(null);
    onUseMasterPassword();
  };

  const formatExpirationTime = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return 'less than an hour';
    }
  };

  const remainingAttempts = sessionInfo 
    ? QUICK_UNLOCK_MAX_ATTEMPTS - sessionInfo.failedAttempts 
    : QUICK_UNLOCK_MAX_ATTEMPTS;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setPin("");
        setError(null);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Enter PIN
          </DialogTitle>
          <DialogDescription>
            {database
              ? `Enter your PIN to unlock "${database.name}"`
              : "Enter your PIN to unlock the database"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* PIN Input with visual dots */}
          <div className="grid gap-2">
            <Label htmlFor="pin">PIN</Label>
            <div className="relative">
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your PIN"
                autoFocus
                disabled={unlocking}
                maxLength={6}
                className="text-center text-lg tracking-[0.5em] font-mono"
              />
            </div>
            {/* PIN dots indicator */}
            <div className="flex justify-center gap-2 py-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i < pin.length
                      ? "bg-primary"
                      : "bg-muted border border-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Session info */}
          {sessionInfo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Session expires in {formatExpirationTime(sessionInfo.expiresAt)}
              </span>
            </div>
          )}

          {/* Warning for failed attempts */}
          {sessionInfo && sessionInfo.failedAttempts > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-3 w-3" />
              <span>
                {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
              </span>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={unlocking}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnlock}
              disabled={pin.length < 4 || unlocking}
              className="flex-1"
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
          </div>
          <Button
            variant="ghost"
            onClick={handleUseMasterPassword}
            disabled={unlocking}
            className="w-full text-muted-foreground"
          >
            Use master password instead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
