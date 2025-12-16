"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { db } from "@/lib/db";
import { TaskColumn } from "./task-column";
import { TaskCardOverlay } from "./task-card";
import { TaskDialog } from "./task-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useLeaderKeyContext } from "@/components/providers/leader-key-provider";
import type { Task, TaskStatus } from "@/lib/tasks/types";
import { TASK_STATUSES } from "@/lib/tasks/types";
import type { CreateTaskInputRef } from "./create-task-input";

export function TaskBoard() {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const inboxInputRef = useRef<CreateTaskInputRef>(null);

  // Fetch all tasks from IndexedDB
  const tasks = useLiveQuery(() => db.tasks.orderBy("order").toArray(), []);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      inbox: [],
      todo: [],
      doing: [],
      done: [],
      archived: [],
    };

    if (tasks) {
      for (const task of tasks) {
        grouped[task.status].push(task);
      }
    }

    return grouped;
  }, [tasks]);

  // Configure drag sensors
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

  // Register leader key context action for creating new task
  const { registerContextActions } = useLeaderKeyContext();

  const focusInboxInput = useCallback(() => {
    inboxInputRef.current?.focus();
  }, []);

  useEffect(() => {
    registerContextActions([
      {
        key: "o",
        action: focusInboxInput,
        label: "New Task",
      },
    ]);

    return () => {
      registerContextActions([]);
    };
  }, [registerContextActions, focusInboxInput]);

  // Create a new task
  const handleCreateTask = async (title: string, status: TaskStatus) => {
    const tasksInColumn = tasksByStatus[status];
    const maxOrder = tasksInColumn.length > 0
      ? Math.max(...tasksInColumn.map((t) => t.order))
      : 0;

    await db.tasks.add({
      title,
      status,
      order: maxOrder + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  // Update a task
  const handleUpdateTask = async (task: Task) => {
    if (!task.id) return;
    await db.tasks.update(task.id, {
      title: task.title,
      description: task.description,
      status: task.status,
      order: task.order,
      updatedAt: new Date(),
    });
  };

  // Delete a task
  const handleDeleteTask = async (taskId: number) => {
    await db.tasks.delete(taskId);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks?.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  // Handle drag over (for moving between columns)
  const handleDragOver = async (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !tasks) return;

    const activeId = active.id as number;
    const overId = over.id;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropping on a column
    const overData = over.data.current;
    if (overData?.type === "column") {
      const newStatus = overData.status as TaskStatus;
      if (activeTask.status !== newStatus) {
        // Move to new column at the end
        const tasksInNewColumn = tasksByStatus[newStatus];
        const maxOrder = tasksInNewColumn.length > 0
          ? Math.max(...tasksInNewColumn.map((t) => t.order))
          : 0;

        await db.tasks.update(activeId, {
          status: newStatus,
          order: maxOrder + 1,
          updatedAt: new Date(),
        });
      }
    }
  };

  // Handle drag end (for reordering)
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !tasks) return;

    const activeId = active.id as number;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    const overTask = tasks.find((t) => t.id === overId);

    if (!activeTask) return;

    // If dropping on another task, reorder within the column
    if (overTask && activeTask.status === overTask.status) {
      const columnTasks = [...tasksByStatus[activeTask.status]];
      const activeIndex = columnTasks.findIndex((t) => t.id === activeId);
      const overIndex = columnTasks.findIndex((t) => t.id === overId);

      if (activeIndex !== -1 && overIndex !== -1) {
        // Remove active task and insert at new position
        columnTasks.splice(activeIndex, 1);
        columnTasks.splice(overIndex, 0, activeTask);

        // Update all orders in the column
        await db.transaction("rw", db.tasks, async () => {
          for (let i = 0; i < columnTasks.length; i++) {
            if (columnTasks[i].id) {
              await db.tasks.update(columnTasks[i].id!, {
                order: i,
                updatedAt: new Date(),
              });
            }
          }
        });
      }
    } else if (overTask && activeTask.status !== overTask.status) {
      // Moving to a different column at a specific position
      const newStatus = overTask.status;
      const columnTasks = [...tasksByStatus[newStatus]];
      const overIndex = columnTasks.findIndex((t) => t.id === overId);

      // Insert active task at the position
      columnTasks.splice(overIndex, 0, { ...activeTask, status: newStatus });

      // Update all orders in the new column and update the active task's status
      await db.transaction("rw", db.tasks, async () => {
        for (let i = 0; i < columnTasks.length; i++) {
          const task = columnTasks[i];
          if (task.id === activeId) {
            await db.tasks.update(activeId, {
              status: newStatus,
              order: i,
              updatedAt: new Date(),
            });
          } else if (task.id) {
            await db.tasks.update(task.id, {
              order: i,
              updatedAt: new Date(),
            });
          }
        }
      });
    }
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  if (!tasks) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="h-full w-full">
          <div className="flex gap-4 p-4 h-full min-h-[calc(100vh-8rem)]">
            {TASK_STATUSES.map((status) => (
              <TaskColumn
                key={status}
                ref={status === "inbox" ? inboxInputRef : null}
                status={status}
                tasks={tasksByStatus[status]}
                onTaskClick={handleTaskClick}
                onCreateTask={handleCreateTask}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </>
  );
}
