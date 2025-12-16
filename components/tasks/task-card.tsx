"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
        "group p-3 bg-card border rounded-lg shadow-sm cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-primary/50 transition-all",
        isCurrentlyDragging && "opacity-50 shadow-lg rotate-2 scale-105",
        task.status === "archived" && "opacity-60"
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <span className="text-sm font-medium break-words">{task.title}</span>
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
        "p-3 bg-card border rounded-lg shadow-lg cursor-grabbing",
        "rotate-3 scale-105"
      )}
    >
      <span className="text-sm font-medium break-words">{task.title}</span>
    </div>
  );
}
