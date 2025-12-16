"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the wrapper which contains the Excalidraw component and CSS
// This is the recommended approach for Next.js App Router
const ExcalidrawWrapper = dynamic(
  () => import("./excalidraw-wrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading canvas...</div>
      </div>
    ),
  }
);

interface ExcalidrawCanvasProps {
  whiteboardId: number;
  initialData: string;
  onChange: (data: string) => void;
}

export function ExcalidrawCanvas({ whiteboardId, initialData, onChange }: ExcalidrawCanvasProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Wait for component to mount to get correct theme (avoids hydration mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to ensure we have the correct theme
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading canvas...</div>
      </div>
    );
  }

  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <ExcalidrawWrapper
      key={whiteboardId} // Only re-mount when switching whiteboards
      initialData={initialData}
      onChange={onChange}
      theme={theme}
    />
  );
}
