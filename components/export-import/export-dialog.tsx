"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react";
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
import { exportData, downloadExport, getModuleCounts } from "@/lib/export-import/export";
import { EXPORT_MODULES, type ExportModule } from "@/lib/export-import/types";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [selectedModules, setSelectedModules] = useState<Set<ExportModule>>(
    new Set(Object.keys(EXPORT_MODULES) as ExportModule[])
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moduleCounts, setModuleCounts] = useState<Record<ExportModule, number> | null>(null);

  // Load module counts when dialog opens
  useEffect(() => {
    if (open) {
      getModuleCounts().then(setModuleCounts).catch(console.error);
      setPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [open]);

  const toggleModule = (module: ExportModule) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedModules.size === Object.keys(EXPORT_MODULES).length) {
      setSelectedModules(new Set());
    } else {
      setSelectedModules(new Set(Object.keys(EXPORT_MODULES) as ExportModule[]));
    }
  };

  const handleExport = async () => {
    setError(null);

    // Validation
    if (selectedModules.size === 0) {
      setError("Please select at least one module to export");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsExporting(true);

    try {
      const data = await exportData({
        modules: Array.from(selectedModules),
        password,
      });

      downloadExport(data);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const totalItems = moduleCounts
    ? Array.from(selectedModules).reduce((sum, m) => sum + (moduleCounts[m] || 0), 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Select which modules to export and set a password to encrypt the backup file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Module selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Modules to export</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="h-auto py-1 px-2 text-xs">
                {selectedModules.size === Object.keys(EXPORT_MODULES).length ? "Deselect all" : "Select all"}
              </Button>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              {(Object.entries(EXPORT_MODULES) as [ExportModule, typeof EXPORT_MODULES[ExportModule]][]).map(
                ([key, { label, description }]) => (
                  <div key={key} className="flex items-start space-x-3">
                    <Checkbox
                      id={key}
                      checked={selectedModules.has(key)}
                      onCheckedChange={() => toggleModule(key)}
                      disabled={moduleCounts ? moduleCounts[key] === 0 : false}
                    />
                    <div className="flex-1 space-y-0.5">
                      <label
                        htmlFor={key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {label}
                        {moduleCounts && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({moduleCounts[key]} items)
                          </span>
                        )}
                      </label>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Password fields */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter encryption password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm encryption password"
              />
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-yellow-700 dark:text-yellow-400">
              The export file will contain sensitive data including database passwords and KeePass files. 
              Keep it secure and remember your password - it cannot be recovered.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedModules.size === 0}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {totalItems > 0 ? `(${totalItems} items)` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
