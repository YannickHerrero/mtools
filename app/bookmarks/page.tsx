"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Bookmark as BookmarkIcon,
  ChevronDown,
  ChevronRight,
  Download,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { db } from "@/lib/db";
import type { Bookmark, BookmarkCategory, ExportedBookmarks } from "@/lib/bookmarks/types";
import { useLeaderKeyContext } from "@/components/providers/leader-key-provider";
import { BookmarkCard } from "@/components/bookmarks/bookmark-card";
import { BookmarkDialog } from "@/components/bookmarks/bookmark-dialog";
import { CategoryDialog } from "@/components/bookmarks/category-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function BookmarksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set());
  const [activeBookmark, setActiveBookmark] = useState<Bookmark | null>(null);

  // Dialog states
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editingCategory, setEditingCategory] = useState<BookmarkCategory | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState<number | undefined>();

  // Database queries
  const categories = useLiveQuery(() =>
    db.bookmarkCategories.orderBy("order").toArray()
  );
  const bookmarks = useLiveQuery(() =>
    db.bookmarks.orderBy("order").toArray()
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter bookmarks based on search
  const filteredBookmarks = useMemo(() => {
    if (!bookmarks || !searchQuery.trim()) return bookmarks;
    const query = searchQuery.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query)
    );
  }, [bookmarks, searchQuery]);

  // Group bookmarks by category
  const bookmarksByCategory = useMemo(() => {
    if (!filteredBookmarks) return new Map<number, Bookmark[]>();
    const map = new Map<number, Bookmark[]>();
    for (const bookmark of filteredBookmarks) {
      const list = map.get(bookmark.categoryId) || [];
      list.push(bookmark);
      map.set(bookmark.categoryId, list);
    }
    return map;
  }, [filteredBookmarks]);

  // Leader key context actions
  const { registerContextActions } = useLeaderKeyContext();

  const focusSearch = useCallback(() => {
    document.querySelector<HTMLInputElement>('input[placeholder="Search bookmarks..."]')?.focus();
  }, []);

  const openAddBookmark = useCallback(() => {
    setEditingBookmark(null);
    setDefaultCategoryId(categories?.[0]?.id);
    setBookmarkDialogOpen(true);
  }, [categories]);

  const openAddCategory = useCallback(() => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  }, []);

  useEffect(() => {
    registerContextActions([
      { key: "o", action: openAddBookmark, label: "New Bookmark" },
      { key: "c", action: openAddCategory, label: "New Category" },
      { key: "s", action: focusSearch, label: "Search" },
    ]);

    return () => {
      registerContextActions([]);
    };
  }, [registerContextActions, openAddBookmark, openAddCategory, focusSearch]);

  // Category CRUD operations
  const createCategory = async (name: string) => {
    const maxOrder = categories?.reduce((max, c) => Math.max(max, c.order), -1) ?? -1;
    const now = new Date();
    await db.bookmarkCategories.add({
      name,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
  };

  const updateCategory = async (id: number, name: string) => {
    await db.bookmarkCategories.update(id, {
      name,
      updatedAt: new Date(),
    });
  };

  const deleteCategory = async (id: number) => {
    // Delete all bookmarks in this category
    await db.bookmarks.where("categoryId").equals(id).delete();
    await db.bookmarkCategories.delete(id);
  };

  // Bookmark CRUD operations
  const createBookmark = async (data: {
    title: string;
    url: string;
    description?: string;
    categoryId: number;
  }) => {
    const categoryBookmarks = bookmarks?.filter((b) => b.categoryId === data.categoryId) || [];
    const maxOrder = categoryBookmarks.reduce((max, b) => Math.max(max, b.order), -1);
    const now = new Date();
    await db.bookmarks.add({
      ...data,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
  };

  const updateBookmark = async (
    id: number,
    data: { title: string; url: string; description?: string; categoryId: number }
  ) => {
    await db.bookmarks.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  };

  const deleteBookmark = async (id: number) => {
    await db.bookmarks.delete(id);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const bookmark = bookmarks?.find((b) => b.id === event.active.id);
    setActiveBookmark(bookmark || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBookmark(null);

    if (!over || active.id === over.id) return;

    const activeBookmark = bookmarks?.find((b) => b.id === active.id);
    const overBookmark = bookmarks?.find((b) => b.id === over.id);

    if (!activeBookmark || !overBookmark) return;

    // Only allow reordering within the same category
    if (activeBookmark.categoryId !== overBookmark.categoryId) return;

    const categoryBookmarks = bookmarks
      ?.filter((b) => b.categoryId === activeBookmark.categoryId)
      .sort((a, b) => a.order - b.order) || [];

    const oldIndex = categoryBookmarks.findIndex((b) => b.id === active.id);
    const newIndex = categoryBookmarks.findIndex((b) => b.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categoryBookmarks, oldIndex, newIndex);

    // Update orders in database
    await Promise.all(
      reordered.map((bookmark, index) =>
        db.bookmarks.update(bookmark.id!, { order: index })
      )
    );
  };

  // Toggle category collapse
  const toggleCategory = (categoryId: number) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Import/Export functionality
  const exportBookmarks = () => {
    if (!categories || !bookmarks) return;

    const exportData: ExportedBookmarks = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      categories: categories.map((cat) => ({
        name: cat.name,
        order: cat.order,
        bookmarks: bookmarks
          .filter((b) => b.categoryId === cat.id)
          .sort((a, b) => a.order - b.order)
          .map((b) => ({
            title: b.title,
            url: b.url,
            description: b.description,
            favicon: b.favicon,
            order: b.order,
          })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookmarks.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importBookmarks = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportedBookmarks;

      if (!data.version || !data.categories) {
        throw new Error("Invalid bookmarks format");
      }

      const now = new Date();
      const existingCategoryNames = new Set(categories?.map((c) => c.name) || []);

      for (const cat of data.categories) {
        // Generate unique name if needed
        let categoryName = cat.name;
        let counter = 1;
        while (existingCategoryNames.has(categoryName)) {
          counter++;
          categoryName = `${cat.name} (${counter})`;
        }
        existingCategoryNames.add(categoryName);

        // Get max order for categories
        const maxCatOrder = (await db.bookmarkCategories.orderBy("order").last())?.order ?? -1;

        // Create category
        const categoryId = (await db.bookmarkCategories.add({
          name: categoryName,
          order: maxCatOrder + 1,
          createdAt: now,
          updatedAt: now,
        })) as number;

        // Create bookmarks in this category
        for (const bookmark of cat.bookmarks) {
          await db.bookmarks.add({
            categoryId,
            title: bookmark.title,
            url: bookmark.url,
            description: bookmark.description,
            favicon: bookmark.favicon,
            order: bookmark.order,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } catch (error) {
      alert(
        `Failed to import bookmarks: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importBookmarks(file);
      event.target.value = "";
    }
  };

  // Handle bookmark save (create or update)
  const handleBookmarkSave = (data: {
    title: string;
    url: string;
    description?: string;
    categoryId: number;
  }) => {
    if (editingBookmark?.id) {
      updateBookmark(editingBookmark.id, data);
    } else {
      createBookmark(data);
    }
  };

  // Handle category save (create or update)
  const handleCategorySave = (name: string) => {
    if (editingCategory?.id) {
      updateCategory(editingCategory.id, name);
    } else {
      createCategory(name);
    }
  };

  // Handle bookmark edit
  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setBookmarkDialogOpen(true);
  };

  // Handle category edit
  const handleEditCategory = (category: BookmarkCategory) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  // Handle add bookmark to specific category
  const handleAddBookmarkToCategory = (categoryId: number) => {
    setEditingBookmark(null);
    setDefaultCategoryId(categoryId);
    setBookmarkDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center gap-4">
        <h1 className="text-lg font-semibold">Bookmarks</h1>
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openAddCategory}>
            <FolderPlus className="h-4 w-4 mr-1" />
            Category
          </Button>
          <Button size="sm" onClick={openAddBookmark}>
            <Plus className="h-4 w-4 mr-1" />
            Bookmark
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportBookmarks}>
                <Download className="h-4 w-4 mr-2" />
                Export Bookmarks
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => document.getElementById("import-bookmarks-input")?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Bookmarks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
        id="import-bookmarks-input"
      />

      {/* Main content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {(!categories || categories.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <BookmarkIcon className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">No bookmarks yet</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Create a category first, then add your bookmarks. Press{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd>{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs">c</kbd> to create a category.
              </p>
              <Button onClick={openAddCategory}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-6">
                {categories.map((category) => {
                  const categoryBookmarks = bookmarksByCategory.get(category.id!) || [];
                  const isCollapsed = collapsedCategories.has(category.id!);

                  return (
                    <div key={category.id} className="space-y-3">
                      {/* Category Header */}
                      <div className="flex items-center gap-2 group">
                        <button
                          onClick={() => toggleCategory(category.id!)}
                          className="flex items-center gap-2 hover:bg-accent rounded-md px-2 py-1 -ml-2"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <h2 className="text-lg font-semibold">{category.name}</h2>
                          <span className="text-sm text-muted-foreground">
                            ({categoryBookmarks.length})
                          </span>
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleAddBookmarkToCategory(category.id!)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => handleEditCategory(category)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteCategory(category.id!)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Bookmarks Grid */}
                      {!isCollapsed && (
                        <SortableContext
                          items={categoryBookmarks.map((b) => b.id!)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div
                            className={cn(
                              "grid gap-3",
                              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            )}
                          >
                            {categoryBookmarks.length > 0 ? (
                              categoryBookmarks.map((bookmark) => (
                                <BookmarkCard
                                  key={bookmark.id}
                                  bookmark={bookmark}
                                  onEdit={handleEditBookmark}
                                  onDelete={deleteBookmark}
                                />
                              ))
                            ) : (
                              <div className="col-span-full py-8 text-center text-muted-foreground text-sm">
                                No bookmarks in this category.{" "}
                                <button
                                  onClick={() => handleAddBookmarkToCategory(category.id!)}
                                  className="text-primary hover:underline"
                                >
                                  Add one
                                </button>
                              </div>
                            )}
                          </div>
                        </SortableContext>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeBookmark && (
                  <div className="opacity-80">
                    <BookmarkCard
                      bookmark={activeBookmark}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t px-4 py-2 flex items-center justify-end text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-muted rounded">Space</kbd>
          <kbd className="px-2 py-1 bg-muted rounded">o</kbd>
          <span>New bookmark</span>
          <kbd className="px-2 py-1 bg-muted rounded ml-2">Space</kbd>
          <kbd className="px-2 py-1 bg-muted rounded">c</kbd>
          <span>New category</span>
          <kbd className="px-2 py-1 bg-muted rounded ml-2">Space</kbd>
          <kbd className="px-2 py-1 bg-muted rounded">s</kbd>
          <span>Search</span>
        </div>
      </div>

      {/* Dialogs */}
      <BookmarkDialog
        open={bookmarkDialogOpen}
        onOpenChange={setBookmarkDialogOpen}
        bookmark={editingBookmark}
        categories={categories || []}
        defaultCategoryId={defaultCategoryId}
        onSave={handleBookmarkSave}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        onSave={handleCategorySave}
      />
    </div>
  );
}
