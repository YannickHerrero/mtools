"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, AlertTriangle, CheckCircle2, XCircle, Eye, EyeOff, FileJson } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { importData, readFileAsText } from "@/lib/export-import/import";
import { EXPORT_MODULES, type ImportResult, type ExportModule } from "@/lib/export-import/types";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/json") {
      setFile(droppedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file to import");
      return;
    }

    if (!password) {
      setError("Please enter the password");
      return;
    }

    setError(null);
    setIsImporting(true);

    try {
      const content = await readFileAsText(file);
      const importResult = await importData(content, { password });
      setResult(importResult);

      if (!importResult.success && importResult.errors.length > 0) {
        setError(importResult.errors[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPassword("");
    setError(null);
    setResult(null);
    onOpenChange(false);
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="space-y-3">
        <div
          className={`flex items-center gap-2 rounded-lg p-3 ${
            result.success
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {result.success ? "Import completed successfully" : "Import completed with errors"}
            </p>
            <p className="text-sm opacity-90">
              {result.totalImported} items imported, {result.totalSkipped} skipped
            </p>
          </div>
        </div>

        <ScrollArea className="h-[200px] rounded-lg border">
          <div className="p-3 space-y-2">
            {result.modules.map((moduleResult) => (
              <div
                key={moduleResult.module}
                className="flex items-center justify-between py-1.5 border-b last:border-0"
              >
                <span className="text-sm font-medium">
                  {EXPORT_MODULES[moduleResult.module as ExportModule]?.label || moduleResult.module}
                </span>
                <div className="flex items-center gap-3 text-xs">
                  {moduleResult.imported > 0 && (
                    <span className="text-green-600 dark:text-green-500">
                      +{moduleResult.imported} imported
                    </span>
                  )}
                  {moduleResult.skipped > 0 && (
                    <span className="text-muted-foreground">{moduleResult.skipped} skipped</span>
                  )}
                  {moduleResult.errors.length > 0 && (
                    <span className="text-destructive">{moduleResult.errors.length} errors</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {result.errors.length > 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive mb-2">Errors:</p>
            <ul className="text-xs text-destructive space-y-1">
              {result.errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {result.errors.length > 5 && (
                <li className="text-muted-foreground">...and {result.errors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            Import data from an encrypted backup file. Existing items will be updated if the imported
            version is newer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!result ? (
            <>
              {/* File selection */}
              <div className="space-y-2">
                <Label>Backup File</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileJson className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to select or drag and drop a backup file
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="importPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="importPassword"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter backup password"
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

              {/* Warning */}
              <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-yellow-700 dark:text-yellow-400">
                  Importing will merge data with your existing data. Items with newer timestamps in the
                  backup will overwrite local versions.
                </p>
              </div>
            </>
          ) : (
            renderResult()
          )}

          {/* Error message */}
          {error && !result && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isImporting || !file}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
