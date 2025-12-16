"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  KeyRound,
  Lock,
  Unlock,
  Plus,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/db";
import type { KeePassDatabase, UnlockedDatabase } from "@/lib/keepass/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface KeePassSidebarProps {
  selectedDatabaseId: number | null;
  unlockedDatabases: Map<number, UnlockedDatabase>;
  onSelectDatabase: (database: KeePassDatabase) => void;
  onAddDatabase: () => void;
  onLockDatabase: (id: number) => void;
  onDeleteDatabase: (id: number) => void;
}

export function KeePassSidebar({
  selectedDatabaseId,
  unlockedDatabases,
  onSelectDatabase,
  onAddDatabase,
  onLockDatabase,
  onDeleteDatabase,
}: KeePassSidebarProps) {
  const databases = useLiveQuery(() =>
    db.keepassDatabases.orderBy("name").toArray()
  );

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this database? The original file will not be affected.")) {
      onDeleteDatabase(id);
    }
  };

  return (
    <div className="h-full flex flex-col border-r">
      {/* Header */}
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Databases</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onAddDatabase}
          title="Add database"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Database List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {(!databases || databases.length === 0) ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No databases added yet
            </div>
          ) : (
            databases.map((database) => {
              const isSelected = database.id === selectedDatabaseId;
              const isUnlocked = unlockedDatabases.has(database.id!);

              return (
                <div
                  key={database.id}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm",
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                  onClick={() => onSelectDatabase(database)}
                >
                  {/* Lock/Unlock Icon */}
                  {isUnlocked ? (
                    <Unlock className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}

                  {/* Database Name */}
                  <span className="truncate flex-1">{database.name}</span>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isUnlocked && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onLockDatabase(database.id!);
                          }}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Lock
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => handleDelete(database.id!, e)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onAddDatabase}
        >
          <KeyRound className="h-4 w-4" />
          Add Database
        </Button>
      </div>
    </div>
  );
}
