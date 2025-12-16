"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const LEADER_KEY = " "; // Space key
const LEADER_TIMEOUT = 1000; // 1 second

type LeaderState = "idle" | "leader-active";

export interface LeaderKeyShortcut {
  key: string;
  action: () => void;
  label: string;
}

interface UseLeaderKeyOptions {
  contextActions?: LeaderKeyShortcut[];
  onOpenCommandMenu?: () => void;
}

export function useLeaderKey(options: UseLeaderKeyOptions = {}) {
  const [state, setState] = useState<LeaderState>("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Base navigation shortcuts
  const navigationShortcuts: LeaderKeyShortcut[] = [
    { key: "t", action: () => router.push("/tasks"), label: "Tasks" },
    { key: "n", action: () => router.push("/notes"), label: "Notes" },
    { key: "a", action: () => router.push("/api-client"), label: "API Client" },
  ];

  // Context-aware shortcuts
  const contextActions = options.contextActions || [];

  // Command menu shortcut (space + space)
  const commandMenuShortcut: LeaderKeyShortcut | null = options.onOpenCommandMenu
    ? { key: " ", action: options.onOpenCommandMenu, label: "Command Menu" }
    : null;

  // All shortcuts combined (command menu shortcut takes priority)
  const shortcuts: LeaderKeyShortcut[] = [
    ...(commandMenuShortcut ? [commandMenuShortcut] : []),
    ...navigationShortcuts,
    ...contextActions,
  ];

  const resetState = useCallback(() => {
    setState("idle");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Skip if typing in an input field
      if (isTyping) return;

      // Skip if any modifier key is pressed
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      if (state === "idle") {
        // Check for leader key (Space)
        if (e.key === LEADER_KEY) {
          e.preventDefault();
          setState("leader-active");

          // Set timeout to reset state
          timeoutRef.current = setTimeout(() => {
            resetState();
          }, LEADER_TIMEOUT);
        }
      } else if (state === "leader-active") {
        e.preventDefault();

        // Check for Escape to cancel
        if (e.key === "Escape") {
          resetState();
          return;
        }

        // Check for matching shortcut
        const shortcut = shortcuts.find((s) => s.key === e.key.toLowerCase());
        if (shortcut) {
          shortcut.action();
        }

        // Reset state after any key press in leader-active mode
        resetState();
      }
    },
    [state, shortcuts, resetState]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  return {
    isLeaderActive: state === "leader-active",
    shortcuts,
  };
}
