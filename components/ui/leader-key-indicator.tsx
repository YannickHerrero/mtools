"use client";

import { useLeaderKeyContext } from "@/components/providers/leader-key-provider";
import { cn } from "@/lib/utils";

export function LeaderKeyIndicator() {
  const { isLeaderActive, shortcuts } = useLeaderKeyContext();

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur transition-all duration-200",
        isLeaderActive
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        Leader Key Active
      </div>
      <div className="space-y-1">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center gap-2 text-sm">
            <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs font-medium">
              {shortcut.key === " " ? "␣" : shortcut.key}
            </kbd>
            <span className="text-muted-foreground">{shortcut.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
