"use client";

import { useCallback, useRef, useMemo, useEffect, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

interface ExcalidrawWrapperProps {
  initialData: string;
  onChange: (data: string) => void;
  theme: "light" | "dark";
}

// Background colors to pass to Excalidraw
// Note: In dark mode, Excalidraw applies a CSS filter (invert(93%) hue-rotate(180deg)) to the canvas
// So we need to pass a color that will look correct AFTER the filter is applied
//
// Light mode: No filter, so we pass the actual light background color (#ffffff)
// Dark mode: Filter inverts colors, so we pass a pre-calculated color that inverts to our dark background
const THEME_BACKGROUNDS = {
  light: "#ffffff",
  dark: "#e6edff", // This will be inverted by Excalidraw's dark mode filter to match app's dark background
} as const;

// Type for the Excalidraw imperative API (subset we need)
interface ExcalidrawAPI {
  updateScene: (opts: { appState?: Record<string, unknown>; elements?: readonly unknown[] }) => void;
  getAppState: () => Record<string, unknown>;
  getSceneElements: () => readonly unknown[];
  refresh: () => void;
}

export default function ExcalidrawWrapper({ initialData, onChange, theme }: ExcalidrawWrapperProps) {
  const isInitialMount = useRef(true);
  const lastSavedData = useRef(initialData);
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);

  // Get background color based on theme prop
  const backgroundColor = THEME_BACKGROUNDS[theme];

  // Parse saved data only once on mount
  const parsedInitialData = useMemo(() => {
    try {
      const parsed = JSON.parse(initialData);
      return {
        elements: parsed.elements || [],
        appState: parsed.appState || {},
      };
    } catch {
      return { elements: [], appState: {} };
    }
  }, [initialData]);

  // Set background color when API is ready and whenever theme changes
  useEffect(() => {
    if (excalidrawAPI) {
      const currentElements = excalidrawAPI.getSceneElements();
      
      excalidrawAPI.updateScene({
        elements: currentElements,
        appState: {
          viewBackgroundColor: backgroundColor,
        },
      });
      
      excalidrawAPI.refresh();
    }
  }, [excalidrawAPI, backgroundColor]);

  // Handle changes from Excalidraw
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[], appState: any) => {
      // Skip the initial render to avoid unnecessary saves
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      // Create the data object to save
      const dataToSave = JSON.stringify({
        elements,
        appState: {
          // Only save relevant app state properties
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          zoom: appState.zoom,
        },
      });

      // Only trigger onChange if data actually changed
      if (dataToSave !== lastSavedData.current) {
        lastSavedData.current = dataToSave;
        onChange(dataToSave);
      }
    },
    [onChange]
  );

  const excalidrawInitialData = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    elements: parsedInitialData.elements as any,
    appState: {
      // Only use saved scroll/zoom, NOT the background color
      gridSize: parsedInitialData.appState.gridSize,
      scrollX: parsedInitialData.appState.scrollX,
      scrollY: parsedInitialData.appState.scrollY,
      zoom: parsedInitialData.appState.zoom,
      // Set theme and background from props
      theme,
      viewBackgroundColor: backgroundColor,
    },
  };

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Excalidraw
        excalidrawAPI={(api) => {
          setExcalidrawAPI(api as ExcalidrawAPI);
        }}
        initialData={excalidrawInitialData}
        onChange={handleChange}
        theme={theme}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveAsImage: true,
          },
        }}
      />
    </div>
  );
}
