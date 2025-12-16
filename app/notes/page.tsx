"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Save, Check, FileText } from "lucide-react";
import { useLeaderKeyContext } from "@/components/providers/leader-key-provider";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { NotesSidebar } from "@/components/notes/notes-sidebar";
import { SearchBar } from "@/components/notes/search-bar";
import { MarkdownEditor } from "@/components/notes/markdown-editor";
import { db, ensureInboxCollection } from "@/lib/db";
import type { Note } from "@/lib/notes/types";

export default function NotesPage() {
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Ensure Inbox collection exists
  useEffect(() => {
    const initInbox = async () => {
      await ensureInboxCollection();
    };
    initInbox();
  }, []);

  // Auto-save functionality with proper debouncing
  useEffect(() => {
    if (!currentNote?.id) return;

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
      await db.notes.update(currentNote.id!, {
        title: currentNote.title,
        content: currentNote.content,
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
  }, [currentNote?.title, currentNote?.content, currentNote?.id]);

  // Register leader key context actions for notes page
  const { registerContextActions } = useLeaderKeyContext();

  const createNewNote = useCallback(async () => {
    const inboxId = await ensureInboxCollection();
    const now = new Date();
    const newNote = {
      collectionId: inboxId,
      title: "",
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.notes.add(newNote);
    setCurrentNote({ ...newNote, id: id as number });

    // Focus title input after state update
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
  }, []);

  const focusSearch = useCallback(() => {
    document.querySelector<HTMLInputElement>('input[placeholder="Search notes..."]')?.focus();
  }, []);

  useEffect(() => {
    registerContextActions([
      {
        key: "o",
        action: createNewNote,
        label: "New Note",
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
  }, [registerContextActions, createNewNote, focusSearch]);

  // Keyboard shortcuts (Cmd/Ctrl only)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Cmd/Ctrl + S: Manual save (even though auto-save is enabled)
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (currentNote?.id) {
          await db.notes.update(currentNote.id, {
            title: currentNote.title,
            content: currentNote.content,
            updatedAt: new Date(),
          });
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentNote]);

  const handleContentChange = (content: string) => {
    if (!currentNote) return;
    setCurrentNote({ ...currentNote, content });
  };

  const calculateWordCount = (): { words: number; characters: number } => {
    if (!currentNote) return { words: 0, characters: 0 };
    const text = currentNote.content;
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
    const characters = text.length;
    return { words, characters };
  };

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

  const { words, characters } = calculateWordCount();

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <h1 className="text-lg font-semibold">Notes</h1>
        {currentNote && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">
              Last edited {formatTimestamp(currentNote.updatedAt)}
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
            <NotesSidebar
              onLoadNote={(note) => {
                setCurrentNote(note);
                setSaveStatus("idle");
              }}
              currentNoteId={currentNote?.id}
              searchQuery={searchQuery}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Main Editor */}
        <ResizablePanel defaultSize={80}>
          {currentNote ? (
            <div className="flex flex-col h-full">
              {/* Title */}
              <div className="p-4 border-b">
                <Input
                  ref={titleInputRef}
                  value={currentNote.title}
                  onChange={(e) => {
                    setCurrentNote({ ...currentNote, title: e.target.value });
                  }}
                  className="text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0"
                  placeholder="Untitled"
                />
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                <MarkdownEditor
                  content={currentNote.content}
                  onChange={handleContentChange}
                  placeholder="Start typing your note in markdown..."
                />
              </div>

              {/* Footer with word count */}
              <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>{words} words</span>
                  <span>{characters} characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">o</kbd>
                  <span>New note</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs ml-2">Space</kbd>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">s</kbd>
                  <span>Search</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">No note selected</h2>
              <p className="text-muted-foreground">
                Select a note from the sidebar or press{" "}
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
