"use client";

import { useState, useCallback, useEffect } from "react";
import { FileSpreadsheet, ChevronRight, Upload } from "lucide-react";
import { useLeaderKeyContext } from "@/components/providers/leader-key-provider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/excel/upload-dialog";
import { SheetViewer } from "@/components/excel/sheet-viewer";
import type { ParsedExcelFile } from "@/lib/excel/types";

export default function ExcelPage() {
  const [selectedFile, setSelectedFile] = useState<ParsedExcelFile | null>(null);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
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

  const handleFileLoaded = useCallback((file: ParsedExcelFile) => {
    setSelectedFile(file);
    setActiveSheetIdx(0);
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
        <Button 
          size="sm" 
          onClick={() => setUploadDialogOpen(true)}
          variant="outline"
        >
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>
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
                onValueChange={(value) => setActiveSheetIdx(Number(value))}
              >
                <TabsList className="h-10 px-4 py-2 bg-transparent">
                  {selectedFile.sheets.map((sheet, idx) => (
                    <TabsTrigger key={idx} value={idx.toString()}>
                      {sheet.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Sheet Content */}
            <div className="flex-1 overflow-hidden">
              {selectedFile.sheets[activeSheetIdx] && (
                <SheetViewer sheet={selectedFile.sheets[activeSheetIdx]} />
              )}
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
