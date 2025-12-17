"use client";

import { useState } from "react";
import { Upload, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseExcelFile } from "@/lib/excel/parser";
import { MAX_FILE_SIZE, ALLOWED_EXTENSIONS } from "@/lib/excel/types";
import type { ParsedExcelFile } from "@/lib/excel/types";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileLoaded: (file: ParsedExcelFile) => void;
}

export function UploadDialog({
  open,
  onOpenChange,
  onFileLoaded,
}: UploadDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setLoading(true);

    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`
        );
      }

      // Validate file type
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        throw new Error(
          `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`
        );
      }

      // Parse the file (only metadata, not full sheets)
      const parsedFile = await parseExcelFile(file);
      
      if (parsedFile.sheetMetadata.length === 0) {
        throw new Error("File contains no sheets");
      }

      onFileLoaded(parsedFile);
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse Excel file";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Excel File</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet file to view it in the Excel viewer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag & Drop Area */}
          <label
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="block p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 cursor-pointer transition-colors"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">Drag and drop your Excel file here</p>
                <p className="text-xs text-muted-foreground">
                  or click to select a file
                </p>
              </div>
            </div>
            <input
              type="file"
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={handleFileInput}
              disabled={loading}
              className="hidden"
            />
          </label>

          {/* File Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Supported formats:</strong> {ALLOWED_EXTENSIONS.join(", ")}
            </p>
            <p>
              <strong>Max file size:</strong> {MAX_FILE_SIZE / 1024 / 1024}MB
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 rounded-lg flex gap-2 items-start">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center gap-2 p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Processing file...
              </span>
            </div>
          )}

          {/* Close Button */}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
