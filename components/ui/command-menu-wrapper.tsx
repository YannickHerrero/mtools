"use client";

import { useLeaderKeyContext } from "@/components/providers/leader-key-provider";
import { CommandMenu } from "@/components/ui/command-menu";

export function CommandMenuWrapper() {
  const { isCommandMenuOpen, setCommandMenuOpen } = useLeaderKeyContext();

  return (
    <CommandMenu open={isCommandMenuOpen} onOpenChange={setCommandMenuOpen} />
  );
}
