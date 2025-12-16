import { KanbanSquare } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <KanbanSquare className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Task Board</h1>
      <p className="text-muted-foreground">Coming soon...</p>
    </div>
  );
}
