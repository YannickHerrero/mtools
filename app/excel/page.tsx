"use client";

import { useState, useCallback, useEffect } from "react";
import { FileSpreadsheet, ChevronRight, Upload, X } from "lucide-react";
import { useLeaderKeyContext } from "@/components/providers/leader-key-provider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/excel/upload-dialog";
import { SheetViewer } from "@/components/excel/sheet-viewer";
import { cleanupWorker } from "@/lib/excel/parser";
import type { ParsedExcelFile, Sheet } from "@/lib/excel/types";

export default function ExcelPage() {
  const [selectedFile, setSelectedFile] = useState<ParsedExcelFile | null>(null);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [loadedSheets, setLoadedSheets] = useState<Map<number, Sheet>>(new Map());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { registerContextActions } = useLeaderKeyContext();

  // Register leader key shortcuts
  useEffect(() => {
    const openUpload = () => setUploadDialogOpen(true);
    
    registerContextActions([
      { key: "o", action: openUpload, label: "Open Excel File" },
    ]);

    return () => registerContextActions([]);
  }, [registerContextActions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupWorker();
      // Clear all loaded sheets
      setLoadedSheets(new Map());
    };
  }, []);

  const handleFileLoaded = useCallback((file: ParsedExcelFile) => {
    // Clear previous file data to free memory
    setLoadedSheets(new Map());
    setSelectedFile(file);
    setActiveSheetIdx(0);
  }, []);

  const handleSheetChange = useCallback((newIdx: number) => {
    setActiveSheetIdx(newIdx);
    // Clean up other sheets to free memory (but keep the current one)
    setLoadedSheets((prev) => {
      const newMap = new Map();
      // Only keep the sheet we're switching to if it exists
      if (prev.has(newIdx)) {
        newMap.set(newIdx, prev.get(newIdx)!);
      }
      return newMap;
    });
  }, []);

  const handleSheetLoaded = useCallback((sheetIdx: number, sheet: Sheet) => {
    setLoadedSheets((prev) => new Map(prev).set(sheetIdx, sheet));
  }, []);

  const handleCloseFile = useCallback(() => {
    // Clean up all data
    setLoadedSheets(new Map());
    setSelectedFile(null);
    setActiveSheetIdx(0);
    cleanupWorker();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Excel Viewer</h1>
          {selectedFile && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{selectedFile.fileName}</span>
            </>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {selectedFile && (
            <>
              <span className="text-xs text-muted-foreground mr-2">
                {selectedFile.sheetMetadata.length} sheet{selectedFile.sheetMetadata.length !== 1 ? 's' : ''} | 
                {loadedSheets.size} loaded
              </span>
              <Button 
                size="sm" 
                onClick={handleCloseFile}
                variant="ghost"
                title="Close file and free memory"
              >
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </>
          )}
          <Button 
            size="sm" 
            onClick={() => setUploadDialogOpen(true)}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">No file selected</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Upload an Excel file to get started. Supported formats: .xlsx, .xls, .xlsm
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Excel File
            </Button>
          </div>
        ) : (
          <>
            {/* Sheet Tabs */}
            <div className="border-b overflow-x-auto">
              <Tabs
                value={activeSheetIdx.toString()}
                onValueChange={(value) => handleSheetChange(Number(value))}
              >
                <TabsList className="h-10 px-4 py-2 bg-transparent">
                  {selectedFile.sheetMetadata.map((metadata, idx) => (
                    <TabsTrigger key={idx} value={idx.toString()}>
                      {metadata.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Sheet Content */}
            <div className="flex-1 overflow-hidden">
              <SheetViewer 
                fileData={selectedFile.fileData}
                sheetMetadata={selectedFile.sheetMetadata[activeSheetIdx]}
                sheetIndex={activeSheetIdx}
                loadedSheet={loadedSheets.get(activeSheetIdx)}
                onSheetLoaded={handleSheetLoaded}
              />
            </div>
          </>
        )}
      </div>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onFileLoaded={handleFileLoaded}
      />
    </div>
  );
}
