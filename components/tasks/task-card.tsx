"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Task } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id!,
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentlyDragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 p-3 bg-card border rounded-lg shadow-sm cursor-pointer",
        "hover:shadow-md hover:border-primary/50 transition-all",
        isCurrentlyDragging && "opacity-50 shadow-lg rotate-2 scale-105",
        task.status === "archived" && "opacity-60"
      )}
      onClick={onClick}
    >
      <button
        className="touch-none p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="flex-1 text-sm font-medium truncate">{task.title}</span>
    </div>
  );
}

interface TaskCardOverlayProps {
  task: Task;
}

export function TaskCardOverlay({ task }: TaskCardOverlayProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 bg-card border rounded-lg shadow-lg cursor-grabbing",
        "rotate-3 scale-105"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium truncate">{task.title}</span>
    </div>
  );
}
