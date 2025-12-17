"use client";

import { FileSpreadsheet, Trash2, Upload, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ParsedExcelFile } from "@/lib/excel/types";
import { useState, useMemo } from "react";

interface ExcelSidebarProps {
  files: ParsedExcelFile[];
  selectedFile: ParsedExcelFile | null;
  onSelectFile: (file: ParsedExcelFile) => void;
  onDeleteFile: (file: ParsedExcelFile) => void;
  onUploadClick: () => void;
}

export function ExcelSidebar({
  files,
  selectedFile,
  onSelectFile,
  onDeleteFile,
  onUploadClick,
}: ExcelSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const query = searchQuery.toLowerCase();
    return files.filter((f) => f.fileName.toLowerCase().includes(query));
  }, [files, searchQuery]);

  return (
    <div className="h-full flex flex-col border-r">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <Button onClick={onUploadClick} size="sm" className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          Upload Excel
        </Button>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* File List */}
      {files.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <div>
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No Excel files uploaded
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click upload to get started
            </p>
          </div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <div>
            <p className="text-xs text-muted-foreground">No matching files</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredFiles.map((file, idx) => (
              <div
                key={idx}
                className={`group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-xs ${
                  selectedFile === file
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => onSelectFile(file)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate flex-1 font-medium">
                  {file.fileName}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(file);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
