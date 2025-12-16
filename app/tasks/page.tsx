"use client";

import { TaskBoard } from "@/components/tasks/task-board";

export default function TasksPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Task Board</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <TaskBoard />
      </div>
    </div>
  );
}
