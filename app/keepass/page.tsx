"use client";

import { useState, useEffect, useCallback } from "react";
import { KeyRound, Lock, ChevronRight } from "lucide-react";
import { useLeaderKeyContext } from "@/components/providers/leader-key-provider";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { db } from "@/lib/db";
import type { KeePassDatabase, KeePassEntry, KeePassGroup, UnlockedDatabase } from "@/lib/keepass/types";
import { openDatabase, extractGroups, extractEntries } from "@/lib/keepass/kdbx-utils";
import { KeePassSidebar } from "@/components/keepass/keepass-sidebar";
import { EntryList } from "@/components/keepass/entry-list";
import { EntryDetails } from "@/components/keepass/entry-details";
import { UnlockDialog } from "@/components/keepass/unlock-dialog";
import { AddDatabaseDialog } from "@/components/keepass/add-database-dialog";

export default function KeePassPage() {
  // Database state
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<number | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<KeePassDatabase | null>(null);
  const [unlockedDatabases, setUnlockedDatabases] = useState<Map<number, UnlockedDatabase>>(new Map());

  // Entry state
  const [groups, setGroups] = useState<KeePassGroup[]>([]);
  const [entries, setEntries] = useState<KeePassEntry[]>([]);
  const [selectedGroupUuid, setSelectedGroupUuid] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<KeePassEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { registerContextActions } = useLeaderKeyContext();

  // Get current unlocked database
  const currentUnlockedDb = selectedDatabaseId ? unlockedDatabases.get(selectedDatabaseId) : null;

  // Update groups and entries when unlocked database changes
  useEffect(() => {
    if (currentUnlockedDb) {
      const dbGroups = extractGroups(currentUnlockedDb.db);
      const dbEntries = extractEntries(currentUnlockedDb.db);
      setGroups(dbGroups);
      setEntries(dbEntries);
      // Select first group if none selected
      if (!selectedGroupUuid && dbGroups.length > 0) {
        setSelectedGroupUuid(dbGroups[0].uuid);
      }
    } else {
      setGroups([]);
      setEntries([]);
      setSelectedGroupUuid(null);
      setSelectedEntry(null);
    }
  }, [currentUnlockedDb, selectedGroupUuid]);

  // Register leader key shortcuts
  const focusSearch = useCallback(() => {
    document.querySelector<HTMLInputElement>('input[placeholder="Search entries..."]')?.focus();
  }, []);

  const openAddDialog = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  const lockCurrentDatabase = useCallback(() => {
    if (selectedDatabaseId) {
      handleLockDatabase(selectedDatabaseId);
    }
  }, [selectedDatabaseId]);

  useEffect(() => {
    registerContextActions([
      { key: "o", action: openAddDialog, label: "Add Database" },
      { key: "s", action: focusSearch, label: "Search" },
      { key: "l", action: lockCurrentDatabase, label: "Lock Database" },
    ]);
    return () => registerContextActions([]);
  }, [registerContextActions, openAddDialog, focusSearch, lockCurrentDatabase]);

  // Handle database selection
  const handleSelectDatabase = async (database: KeePassDatabase) => {
    setSelectedDatabaseId(database.id!);
    setSelectedDatabase(database);
    setSelectedEntry(null);
    setSearchQuery("");

    // If database is not unlocked, show unlock dialog
    if (!unlockedDatabases.has(database.id!)) {
      setUnlockDialogOpen(true);
    }
  };

  // Handle database unlock
  const handleUnlock = async (password: string, keyFileData?: ArrayBuffer) => {
    if (!selectedDatabase) return;

    const kdbx = await openDatabase(
      selectedDatabase.fileData,
      password,
      keyFileData || selectedDatabase.keyFileData
    );

    const unlockedDb: UnlockedDatabase = {
      id: selectedDatabase.id!,
      name: selectedDatabase.name,
      db: kdbx,
    };

    setUnlockedDatabases((prev) => {
      const next = new Map(prev);
      next.set(selectedDatabase.id!, unlockedDb);
      return next;
    });

    // Update last opened time
    await db.keepassDatabases.update(selectedDatabase.id!, {
      lastOpened: new Date(),
    });
  };

  // Handle database lock
  const handleLockDatabase = (id: number) => {
    setUnlockedDatabases((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    // Clear entry state if this was the selected database
    if (id === selectedDatabaseId) {
      setGroups([]);
      setEntries([]);
      setSelectedGroupUuid(null);
      setSelectedEntry(null);
    }
  };

  // Handle database deletion
  const handleDeleteDatabase = async (id: number) => {
    // Lock the database first if it's unlocked
    if (unlockedDatabases.has(id)) {
      handleLockDatabase(id);
    }

    // Delete from IndexedDB
    await db.keepassDatabases.delete(id);

    // Clear selection if this was selected
    if (id === selectedDatabaseId) {
      setSelectedDatabaseId(null);
      setSelectedDatabase(null);
    }
  };

  // Handle adding a new database
  const handleAddDatabase = async (data: {
    name: string;
    fileName: string;
    fileData: ArrayBuffer;
    keyFileName?: string;
    keyFileData?: ArrayBuffer;
  }) => {
    const now = new Date();
    await db.keepassDatabases.add({
      name: data.name,
      fileName: data.fileName,
      fileData: data.fileData,
      keyFileName: data.keyFileName,
      keyFileData: data.keyFileData,
      createdAt: now,
      updatedAt: now,
    });
  };

  // Handle group selection
  const handleSelectGroup = (uuid: string) => {
    setSelectedGroupUuid(uuid);
  };

  // Handle entry selection
  const handleSelectEntry = (entry: KeePassEntry) => {
    setSelectedEntry(entry);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <KeyRound className="h-5 w-5" />
        <h1 className="text-lg font-semibold">KeePass</h1>
        {selectedDatabase && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {selectedDatabase.name}
            </span>
            {currentUnlockedDb ? (
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                Unlocked
              </span>
            ) : (
              <span className="text-xs bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </>
        )}
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Databases Sidebar */}
        <ResizablePanel defaultSize={15} minSize={12} maxSize={25}>
          <KeePassSidebar
            selectedDatabaseId={selectedDatabaseId}
            unlockedDatabases={unlockedDatabases}
            onSelectDatabase={handleSelectDatabase}
            onAddDatabase={() => setAddDialogOpen(true)}
            onLockDatabase={handleLockDatabase}
            onDeleteDatabase={handleDeleteDatabase}
          />
        </ResizablePanel>

        <ResizableHandle />

        {/* Groups & Entries Panel */}
        <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
          {!selectedDatabaseId ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground border-r">
              Select a database
            </div>
          ) : !currentUnlockedDb ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 border-r p-4">
              <Lock className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Database is locked
              </p>
              <button
                onClick={() => setUnlockDialogOpen(true)}
                className="text-sm text-primary hover:underline"
              >
                Click to unlock
              </button>
            </div>
          ) : (
            <EntryList
              groups={groups}
              entries={entries}
              selectedGroupUuid={selectedGroupUuid}
              selectedEntryUuid={selectedEntry?.uuid || null}
              onSelectGroup={handleSelectGroup}
              onSelectEntry={handleSelectEntry}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}
        </ResizablePanel>

        <ResizableHandle />

        {/* Entry Details Panel */}
        <ResizablePanel defaultSize={60}>
          {!selectedDatabaseId ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <KeyRound className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">No database selected</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Add a KeePass database file (.kdbx) to get started. Your passwords
                will be stored securely and can be accessed anytime.
              </p>
            </div>
          ) : !currentUnlockedDb ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Lock className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">Database locked</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Enter your master password to unlock the database and access your
                passwords.
              </p>
            </div>
          ) : (
            <EntryDetails entry={selectedEntry} />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Footer */}
      <div className="border-t px-4 py-2 flex items-center justify-end text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-muted rounded">Space</kbd>
          <kbd className="px-2 py-1 bg-muted rounded">o</kbd>
          <span>Add database</span>
          <kbd className="px-2 py-1 bg-muted rounded ml-2">Space</kbd>
          <kbd className="px-2 py-1 bg-muted rounded">s</kbd>
          <span>Search</span>
          <kbd className="px-2 py-1 bg-muted rounded ml-2">Space</kbd>
          <kbd className="px-2 py-1 bg-muted rounded">l</kbd>
          <span>Lock</span>
        </div>
      </div>

      {/* Dialogs */}
      <UnlockDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        database={selectedDatabase}
        onUnlock={handleUnlock}
      />

      <AddDatabaseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddDatabase}
      />
    </div>
  );
}
