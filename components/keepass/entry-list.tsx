"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Key,
  Search,
} from "lucide-react";
import type { KeePassGroup, KeePassEntry } from "@/lib/keepass/types";
import { getChildGroups, getEntriesForGroup, searchEntries } from "@/lib/keepass/kdbx-utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface EntryListProps {
  groups: KeePassGroup[];
  entries: KeePassEntry[];
  selectedGroupUuid: string | null;
  selectedEntryUuid: string | null;
  onSelectGroup: (uuid: string) => void;
  onSelectEntry: (entry: KeePassEntry) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function EntryList({
  groups,
  entries,
  selectedGroupUuid,
  selectedEntryUuid,
  onSelectGroup,
  onSelectEntry,
  searchQuery,
  onSearchChange,
}: EntryListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(groups.map((g) => g.uuid)) // Start with all groups expanded
  );

  // Filter entries based on search
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    return searchEntries(entries, searchQuery);
  }, [entries, searchQuery]);

  // When searching, show all matching entries regardless of group
  const isSearching = searchQuery.trim().length > 0;

  const toggleGroup = (uuid: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
  };

  const renderGroup = (group: KeePassGroup, depth: number = 0) => {
    const childGroups = getChildGroups(groups, group.uuid);
    const groupEntries = getEntriesForGroup(entries, group.uuid);
    const isExpanded = expandedGroups.has(group.uuid);
    const isSelected = group.uuid === selectedGroupUuid;
    const hasChildren = childGroups.length > 0 || groupEntries.length > 0;

    return (
      <div key={group.uuid}>
        {/* Group Header */}
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer text-sm hover:bg-muted",
            isSelected && "bg-accent text-accent-foreground"
          )}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => {
            onSelectGroup(group.uuid);
            if (hasChildren) {
              toggleGroup(group.uuid);
            }
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
            )
          ) : (
            <span className="w-3" />
          )}

          {/* Folder Icon */}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}

          {/* Group Name */}
          <span className="truncate flex-1">{group.name}</span>

          {/* Entry Count */}
          {groupEntries.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {groupEntries.length}
            </span>
          )}
        </div>

        {/* Children */}
        {isExpanded && (
          <>
            {/* Child Groups */}
            {childGroups.map((child) => renderGroup(child, depth + 1))}

            {/* Entries */}
            {groupEntries.map((entry) => (
              <div
                key={entry.uuid}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-sm hover:bg-muted",
                  entry.uuid === selectedEntryUuid && "bg-accent text-accent-foreground"
                )}
                style={{ paddingLeft: `${20 + depth * 12}px` }}
                onClick={() => onSelectEntry(entry)}
              >
                <Key className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate flex-1">{entry.title || "Untitled"}</span>
                {entry.username && (
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {entry.username}
                  </span>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  // Get root groups
  const rootGroups = useMemo(() => {
    return groups.filter((g) => !g.parentUuid);
  }, [groups]);

  return (
    <div className="h-full flex flex-col border-r">
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Groups and Entries */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {groups.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No groups found
            </div>
          ) : isSearching ? (
            // Search results - flat list
            <div className="space-y-0.5">
              {filteredEntries.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No entries match your search
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <div
                    key={entry.uuid}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-muted",
                      entry.uuid === selectedEntryUuid && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => onSelectEntry(entry)}
                  >
                    <Key className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{entry.title || "Untitled"}</div>
                      {entry.username && (
                        <div className="text-xs text-muted-foreground truncate">
                          {entry.username}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Tree view
            <div className="space-y-0.5">
              {rootGroups.map((group) => renderGroup(group))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Stats */}
      <div className="p-2 border-t text-xs text-muted-foreground">
        {isSearching
          ? `${filteredEntries.length} result${filteredEntries.length !== 1 ? "s" : ""}`
          : `${groups.length} group${groups.length !== 1 ? "s" : ""}, ${entries.length} entr${entries.length !== 1 ? "ies" : "y"}`}
      </div>
    </div>
  );
}
