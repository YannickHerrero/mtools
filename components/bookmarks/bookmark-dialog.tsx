"use client";

import { useState, useEffect } from "react";
import type { Bookmark, BookmarkCategory } from "@/lib/bookmarks/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmark?: Bookmark | null;
  categories: BookmarkCategory[];
  defaultCategoryId?: number;
  onSave: (data: {
    title: string;
    url: string;
    description?: string;
    categoryId: number;
  }) => void;
}

export function BookmarkDialog({
  open,
  onOpenChange,
  bookmark,
  categories,
  defaultCategoryId,
  onSave,
}: BookmarkDialogProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  const isEditing = !!bookmark;

  useEffect(() => {
    if (open) {
      if (bookmark) {
        setTitle(bookmark.title);
        setUrl(bookmark.url);
        setDescription(bookmark.description || "");
        setCategoryId(bookmark.categoryId);
      } else {
        setTitle("");
        setUrl("");
        setDescription("");
        setCategoryId(defaultCategoryId || categories[0]?.id);
      }
    }
  }, [open, bookmark, defaultCategoryId, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim() || !categoryId) return;

    onSave({
      title: title.trim(),
      url: url.trim(),
      description: description.trim() || undefined,
      categoryId,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Bookmark" : "Add Bookmark"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the bookmark details below."
                : "Add a new bookmark to your collection."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Bookmark"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description..."
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={categoryId?.toString()}
                onValueChange={(value) => setCategoryId(parseInt(value, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id!.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !url.trim() || !categoryId}>
              {isEditing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
