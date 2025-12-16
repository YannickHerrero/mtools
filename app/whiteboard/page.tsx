"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Save, Check, PenTool } from "lucide-react";
import { useLeaderKeyContext } from "@/components/providers/leader-key-provider";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { WhiteboardSidebar } from "@/components/whiteboard/whiteboard-sidebar";
import { SearchBar } from "@/components/whiteboard/search-bar";
import { ExcalidrawCanvas } from "@/components/whiteboard/excalidraw-canvas";
import { db, ensureWhiteboardInboxCollection } from "@/lib/db";
import type { Whiteboard } from "@/lib/whiteboard/types";

export default function WhiteboardPage() {
  return (
    <Suspense fallback={<WhiteboardPageSkeleton />}>
      <WhiteboardPageContent />
    </Suspense>
  );
}

function WhiteboardPageSkeleton() {
  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <h1 className="text-lg font-semibold">Whiteboard</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    </div>
  );
}

function WhiteboardPageContent() {
  const searchParams = useSearchParams();
  const [currentWhiteboard, setCurrentWhiteboard] = useState<Whiteboard | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedFromParams = useRef(false);

  // Ensure Inbox collection exists
  useEffect(() => {
    const initInbox = async () => {
      await ensureWhiteboardInboxCollection();
    };
    initInbox();
  }, []);

  // Load whiteboard from URL query param (e.g., from spotlight search)
  useEffect(() => {
    const whiteboardId = searchParams.get("whiteboardId");
    if (whiteboardId && !hasLoadedFromParams.current) {
      hasLoadedFromParams.current = true;
      const loadWhiteboard = async () => {
        const whiteboard = await db.whiteboards.get(parseInt(whiteboardId, 10));
        if (whiteboard) {
          setCurrentWhiteboard(whiteboard);
          setSaveStatus("idle");
        }
      };
      loadWhiteboard();
    }
  }, [searchParams]);

  // Auto-save functionality with proper debouncing for title changes
  useEffect(() => {
    if (!currentWhiteboard?.id) return;

    // Clear existing timeouts
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (savedStatusTimeoutRef.current) {
      clearTimeout(savedStatusTimeoutRef.current);
    }

    // Show saving status
    setSaveStatus("saving");

    // Schedule save after 3 seconds of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      await db.whiteboards.update(currentWhiteboard.id!, {
        title: currentWhiteboard.title,
        data: currentWhiteboard.data,
        updatedAt: new Date(),
      });
      setSaveStatus("saved");
      
      // Reset to idle after showing "saved" for 2 seconds
      savedStatusTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (savedStatusTimeoutRef.current) {
        clearTimeout(savedStatusTimeoutRef.current);
      }
    };
  }, [currentWhiteboard?.title, currentWhiteboard?.id]);

  // Handle canvas data changes with immediate save
  const handleCanvasChange = useCallback((data: string) => {
    setCurrentWhiteboard(prev => {
      if (!prev?.id) return prev;
      
      // Clear existing timeouts
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (savedStatusTimeoutRef.current) {
        clearTimeout(savedStatusTimeoutRef.current);
      }

      // Show saving status
      setSaveStatus("saving");

      // Schedule save after 1 second for canvas changes (faster than title)
      saveTimeoutRef.current = setTimeout(async () => {
        await db.whiteboards.update(prev.id!, {
          data,
          updatedAt: new Date(),
        });
        setSaveStatus("saved");
        
        // Reset to idle after showing "saved" for 2 seconds
        savedStatusTimeoutRef.current = setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      }, 1000);

      return { ...prev, data };
    });
  }, []);

  // Register leader key context actions for whiteboard page
  const { registerContextActions } = useLeaderKeyContext();

  const createNewWhiteboard = useCallback(async () => {
    const inboxId = await ensureWhiteboardInboxCollection();
    const now = new Date();
    const newWhiteboard = {
      collectionId: inboxId,
      title: "",
      data: JSON.stringify({ elements: [], appState: {} }),
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.whiteboards.add(newWhiteboard);
    setCurrentWhiteboard({ ...newWhiteboard, id: id as number });

    // Focus title input after state update
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
  }, []);

  const focusSearch = useCallback(() => {
    document.querySelector<HTMLInputElement>('input[placeholder="Search whiteboards..."]')?.focus();
  }, []);

  useEffect(() => {
    registerContextActions([
      {
        key: "o",
        action: createNewWhiteboard,
        label: "New Whiteboard",
      },
      {
        key: "s",
        action: focusSearch,
        label: "Search",
      },
    ]);

    return () => {
      registerContextActions([]);
    };
  }, [registerContextActions, createNewWhiteboard, focusSearch]);

  // Keyboard shortcuts (Cmd/Ctrl only)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Cmd/Ctrl + S: Manual save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (currentWhiteboard?.id) {
          await db.whiteboards.update(currentWhiteboard.id, {
            title: currentWhiteboard.title,
            data: currentWhiteboard.data,
            updatedAt: new Date(),
          });
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentWhiteboard]);

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <h1 className="text-lg font-semibold">Whiteboard</h1>
        {currentWhiteboard && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">
              Last edited {formatTimestamp(currentWhiteboard.updatedAt)}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {saveStatus === "saving" && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Save className="h-3 w-3 animate-pulse" />
                  <span>Saving...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-3 w-3" />
                  <span>Saved</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sidebar */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <div className="h-full flex flex-col border-r">
            <div className="p-2 border-b">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            <WhiteboardSidebar
              onLoadWhiteboard={(whiteboard) => {
                setCurrentWhiteboard(whiteboard);
                setSaveStatus("idle");
              }}
              currentWhiteboardId={currentWhiteboard?.id}
              searchQuery={searchQuery}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Main Canvas */}
        <ResizablePanel defaultSize={80}>
          {currentWhiteboard ? (
            <div className="flex flex-col h-full">
              {/* Title */}
              <div className="p-4 border-b">
                <Input
                  ref={titleInputRef}
                  value={currentWhiteboard.title}
                  onChange={(e) => {
                    setCurrentWhiteboard({ ...currentWhiteboard, title: e.target.value });
                  }}
                  className="text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0"
                  placeholder="Untitled"
                />
              </div>

              {/* Canvas */}
              <div className="flex-1 overflow-hidden">
                <ExcalidrawCanvas
                  whiteboardId={currentWhiteboard.id!}
                  initialData={currentWhiteboard.data}
                  onChange={handleCanvasChange}
                />
              </div>

              {/* Footer with keyboard hints */}
              <div className="border-t px-4 py-2 flex items-center justify-end text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">o</kbd>
                  <span>New whiteboard</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs ml-2">Space</kbd>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">s</kbd>
                  <span>Search</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <PenTool className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">No whiteboard selected</h2>
              <p className="text-muted-foreground">
                Select a whiteboard from the sidebar or press{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd>{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs">o</kbd> to create a new one
              </p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
