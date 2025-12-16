"use client";

import { forwardRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskCard } from "./task-card";
import { CreateTaskInput, type CreateTaskInputRef } from "./create-task-input";
import type { Task, TaskStatus } from "@/lib/tasks/types";
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask: (title: string, status: TaskStatus) => void;
}

export const TaskColumn = forwardRef<CreateTaskInputRef, TaskColumnProps>(
  function TaskColumn({ status, tasks, onTaskClick, onCreateTask }, ref) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: "column",
      status,
    },
  });

  const taskIds = tasks.map((task) => task.id!);

  return (
    <div
      className={cn(
        "flex flex-col h-full min-w-[280px] w-[280px] bg-muted/30 rounded-xl border",
        status === "archived" && "opacity-75"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-md",
              TASK_STATUS_COLORS[status]
            )}
          >
            {TASK_STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks List */}
      <ScrollArea className="flex-1">
        <div
          ref={setNodeRef}
          className={cn(
            "p-2 space-y-2 min-h-[100px] transition-colors",
            isOver && "bg-primary/5"
          )}
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </SortableContext>

          {tasks.length === 0 && !isOver && (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              No tasks
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create Task Input */}
      <div className="p-2 border-t">
        <CreateTaskInput
          ref={ref}
          onCreateTask={(title) => onCreateTask(title, status)}
          placeholder={`Add to ${TASK_STATUS_LABELS[status].toLowerCase()}...`}
        />
      </div>
    </div>
  );
});
