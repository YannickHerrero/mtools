"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CreateTaskInputProps {
  onCreateTask: (title: string) => void;
  placeholder?: string;
  className?: string;
}

export interface CreateTaskInputRef {
  focus: () => void;
}

export const CreateTaskInput = forwardRef<CreateTaskInputRef, CreateTaskInputProps>(
  function CreateTaskInput({ onCreateTask, placeholder = "Add a task...", className }, ref) {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isEditing]);

    // Expose focus method to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        setIsEditing(true);
      },
    }));

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle) {
      onCreateTask(trimmedTitle);
      setTitle("");
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setTitle("");
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleSubmit();
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          "flex items-center gap-2 w-full p-2 text-sm text-muted-foreground",
          "hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors",
          className
        )}
      >
        <Plus className="h-4 w-4" />
        <span>{placeholder}</span>
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn("h-9", className)}
    />
  );
});
