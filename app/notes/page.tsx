import { StickyNote } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <StickyNote className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Notes</h1>
      <p className="text-muted-foreground">Coming soon...</p>
    </div>
  );
}
