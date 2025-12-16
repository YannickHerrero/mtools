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
}: {
  children: React.ReactNode;
  contextActions: ContextAction[];
  setContextActions: React.Dispatch<React.SetStateAction<ContextAction[]>>;
}) {
  const { isLeaderActive, shortcuts } = useLeaderKey({ contextActions });

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
    }),
    [isLeaderActive, shortcuts, registerContextActions]
  );

  return (
    <LeaderKeyContext.Provider value={value}>
      {children}
    </LeaderKeyContext.Provider>
  );
}

export function LeaderKeyProvider({ children }: { children: React.ReactNode }) {
  const [contextActions, setContextActions] = React.useState<ContextAction[]>([]);

  return (
    <LeaderKeyProviderInner
      contextActions={contextActions}
      setContextActions={setContextActions}
    >
      {children}
    </LeaderKeyProviderInner>
  );
}
