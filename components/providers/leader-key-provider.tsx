"use client";

import * as React from "react";
import { useLeaderKey } from "@/hooks/use-leader-key";

interface ContextAction {
  key: string;
  action: () => void;
  label: string;
}

interface LeaderKeyContextValue {
  isLeaderActive: boolean;
  shortcuts: { key: string; label: string }[];
  registerContextActions: (actions: ContextAction[]) => void;
  isCommandMenuOpen: boolean;
  setCommandMenuOpen: (open: boolean) => void;
}

const LeaderKeyContext = React.createContext<LeaderKeyContextValue | null>(null);

export function useLeaderKeyContext() {
  const context = React.useContext(LeaderKeyContext);
  if (!context) {
    throw new Error("useLeaderKeyContext must be used within a LeaderKeyProvider");
  }
  return context;
}

function LeaderKeyProviderInner({
  children,
  contextActions,
  setContextActions,
  isCommandMenuOpen,
  setCommandMenuOpen,
}: {
  children: React.ReactNode;
  contextActions: ContextAction[];
  setContextActions: React.Dispatch<React.SetStateAction<ContextAction[]>>;
  isCommandMenuOpen: boolean;
  setCommandMenuOpen: (open: boolean) => void;
}) {
  const openCommandMenu = React.useCallback(() => {
    setCommandMenuOpen(true);
  }, [setCommandMenuOpen]);

  const { isLeaderActive, shortcuts } = useLeaderKey({
    contextActions,
    onOpenCommandMenu: openCommandMenu,
  });

  const registerContextActions = React.useCallback(
    (actions: ContextAction[]) => {
      setContextActions(actions);
    },
    [setContextActions]
  );

  const value = React.useMemo(
    () => ({
      isLeaderActive,
      shortcuts: shortcuts.map((s) => ({ key: s.key, label: s.label })),
      registerContextActions,
      isCommandMenuOpen,
      setCommandMenuOpen,
    }),
    [isLeaderActive, shortcuts, registerContextActions, isCommandMenuOpen, setCommandMenuOpen]
  );

  return (
    <LeaderKeyContext.Provider value={value}>
      {children}
    </LeaderKeyContext.Provider>
  );
}

export function LeaderKeyProvider({ children }: { children: React.ReactNode }) {
  const [contextActions, setContextActions] = React.useState<ContextAction[]>([]);
  const [isCommandMenuOpen, setCommandMenuOpen] = React.useState(false);

  return (
    <LeaderKeyProviderInner
      contextActions={contextActions}
      setContextActions={setContextActions}
      isCommandMenuOpen={isCommandMenuOpen}
      setCommandMenuOpen={setCommandMenuOpen}
    >
      {children}
    </LeaderKeyProviderInner>
  );
}
