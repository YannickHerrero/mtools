"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Database,
  FileText,
  KanbanSquare,
  Send,
  StickyNote,
  Plus,
  Search,
  PenTool,
} from "lucide-react";
import { db } from "@/lib/db";
import type { Note } from "@/lib/notes/types";
import type { Whiteboard } from "@/lib/whiteboard/types";
import { cn } from "@/lib/utils";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [mode, setMode] = React.useState<"search" | "add-task">("search");
  const [taskTitle, setTaskTitle] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fetch notes for search
  const notes = useLiveQuery(() => db.notes.toArray(), []);

  // Fetch whiteboards for search
  const whiteboards = useLiveQuery(() => db.whiteboards.toArray(), []);

  // Filter notes based on search query
  const filteredNotes = React.useMemo(() => {
    if (!notes || !search) return notes || [];
    return notes.filter((note) =>
      note.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [notes, search]);

  // Filter whiteboards based on search query
  const filteredWhiteboards = React.useMemo(() => {
    if (!whiteboards || !search) return whiteboards || [];
    return whiteboards.filter((whiteboard) =>
      whiteboard.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [whiteboards, search]);

  // Reset state when menu closes
  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setMode("search");
      setTaskTitle("");
    }
  }, [open]);

  // Focus input when mode changes to add-task
  React.useEffect(() => {
    if (mode === "add-task" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const handleSelectNote = (note: Note) => {
    // Navigate to notes page with the note ID as a query param
    router.push(`/notes?noteId=${note.id}`);
    onOpenChange(false);
  };

  const handleSelectWhiteboard = (whiteboard: Whiteboard) => {
    // Navigate to whiteboard page with the whiteboard ID as a query param
    router.push(`/whiteboard?whiteboardId=${whiteboard.id}`);
    onOpenChange(false);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    onOpenChange(false);
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;

    const now = new Date();
    await db.tasks.add({
      title: taskTitle.trim(),
      status: "inbox",
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    setTaskTitle("");
    setMode("search");
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === "add-task") {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddTask();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMode("search");
        setTaskTitle("");
      }
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop with blur */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/20 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg mx-4",
            "bg-background border rounded-lg shadow-2xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {/* Accessible title (visually hidden) */}
          <VisuallyHidden.Root asChild>
            <DialogPrimitive.Title>Command Menu</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <VisuallyHidden.Root asChild>
            <DialogPrimitive.Description>
              Search notes and whiteboards, navigate to pages, or perform actions
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>

          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
            {mode === "search" ? (
              <>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search notes, whiteboards, navigate, or take actions..."
                    className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <Command.List className="max-h-[300px] overflow-y-auto p-2">
                  <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                    No results found.
                  </Command.Empty>

                  {/* Navigation Section */}
                  <Command.Group
                    heading="Navigation"
                    className="text-xs font-medium text-muted-foreground px-2 py-1.5"
                  >
                    <Command.Item
                      value="navigate-tasks"
                      onSelect={() => handleNavigate("/tasks")}
                      className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <KanbanSquare className="h-4 w-4" />
                      <span>Tasks</span>
                      <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                        t
                      </kbd>
                    </Command.Item>
                    <Command.Item
                      value="navigate-notes"
                      onSelect={() => handleNavigate("/notes")}
                      className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <StickyNote className="h-4 w-4" />
                      <span>Notes</span>
                      <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                        n
                      </kbd>
                    </Command.Item>
                    <Command.Item
                      value="navigate-whiteboard"
                      onSelect={() => handleNavigate("/whiteboard")}
                      className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <PenTool className="h-4 w-4" />
                      <span>Whiteboard</span>
                      <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                        w
                      </kbd>
                    </Command.Item>
                    <Command.Item
                      value="navigate-api-client"
                      onSelect={() => handleNavigate("/api-client")}
                      className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <Send className="h-4 w-4" />
                      <span>API Client</span>
                      <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                        a
                      </kbd>
                    </Command.Item>
                    <Command.Item
                      value="navigate-database"
                      onSelect={() => handleNavigate("/database")}
                      className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <Database className="h-4 w-4" />
                      <span>Database</span>
                      <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                        d
                      </kbd>
                    </Command.Item>
                  </Command.Group>

                  {/* Actions Section */}
                  <Command.Group
                    heading="Actions"
                    className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2"
                  >
                    <Command.Item
                      value="add-task"
                      onSelect={() => setMode("add-task")}
                      className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add new task</span>
                    </Command.Item>
                  </Command.Group>

                  {/* Notes Section */}
                  {filteredNotes && filteredNotes.length > 0 && (
                    <Command.Group
                      heading="Notes"
                      className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2"
                    >
                      {filteredNotes.slice(0, 10).map((note) => (
                        <Command.Item
                          key={note.id}
                          value={`note-${note.id}-${note.title}`}
                          onSelect={() => handleSelectNote(note)}
                          className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="truncate">
                            {note.title || "Untitled"}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Whiteboards Section */}
                  {filteredWhiteboards && filteredWhiteboards.length > 0 && (
                    <Command.Group
                      heading="Whiteboards"
                      className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2"
                    >
                      {filteredWhiteboards.slice(0, 10).map((whiteboard) => (
                        <Command.Item
                          key={whiteboard.id}
                          value={`whiteboard-${whiteboard.id}-${whiteboard.title}`}
                          onSelect={() => handleSelectWhiteboard(whiteboard)}
                          className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                        >
                          <PenTool className="h-4 w-4" />
                          <span className="truncate">
                            {whiteboard.title || "Untitled"}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {new Date(whiteboard.updatedAt).toLocaleDateString()}
                          </span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                </Command.List>
                <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
                    <span>navigate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
                    <span>select</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">esc</kbd>
                    <span>close</span>
                  </div>
                </div>
              </>
            ) : (
              /* Add Task Mode */
              <div className="p-4" onKeyDown={handleKeyDown}>
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="h-4 w-4" />
                  <span className="font-medium">Add new task</span>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
                    <span>add task</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded">esc</kbd>
                    <span>cancel</span>
                  </div>
                </div>
              </div>
            )}
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
