"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { getCellDisplayValue, parseSheet } from "@/lib/excel/parser";
import { Loader2 } from "lucide-react";
import type { Sheet, Cell, SheetMetadata } from "@/lib/excel/types";
import { cn } from "@/lib/utils";

interface SheetViewerProps {
  fileData: ArrayBuffer;
  sheetMetadata: SheetMetadata;
  sheetIndex: number;
  loadedSheet?: Sheet;
  onSheetLoaded: (sheetIndex: number, sheet: Sheet) => void;
}

const ROW_HEIGHT = 24;
const CELL_MIN_WIDTH = 50;
const CELL_MAX_WIDTH = 250;
const VISIBLE_ROWS_BUFFER = 5;
const VISIBLE_COLS_BUFFER = 3;

export function SheetViewer({ fileData, sheetMetadata, sheetIndex, loadedSheet, onSheetLoaded }: SheetViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleRowRange, setVisibleRowRange] = useState({ start: 0, end: 50 });
  const [visibleColRange, setVisibleColRange] = useState({ start: 0, end: 20 });
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when sheet index changes
  useEffect(() => {
    setIsLoading(false);
    setVisibleRowRange({ start: 0, end: 50 });
    setVisibleColRange({ start: 0, end: 20 });
  }, [sheetIndex]);

  // Load sheet data lazily
  useEffect(() => {
    if (!loadedSheet && !isLoading) {
      console.log('Loading sheet:', sheetMetadata.name);
      setIsLoading(true);
      parseSheet(fileData, sheetMetadata.name)
        .then((sheet) => {
          console.log('Sheet loaded:', sheetMetadata.name, sheet);
          onSheetLoaded(sheetIndex, sheet);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Failed to load sheet:', error);
          setIsLoading(false);
        });
    }
  }, [fileData, sheetMetadata.name, sheetIndex, loadedSheet, onSheetLoaded, isLoading]);

  // Cleanup effect - reset visible ranges when component unmounts
  useEffect(() => {
    return () => {
      // Reset visible ranges to trigger garbage collection
      setVisibleRowRange({ start: 0, end: 0 });
      setVisibleColRange({ start: 0, end: 0 });
    };
  }, []);

  // Calculate column widths
  const columnWidths = useMemo(() => {
    if (!loadedSheet?.rows || loadedSheet.rows.length === 0) {
      return new Array(sheetMetadata.columnCount).fill(CELL_MIN_WIDTH);
    }

    const maxCols = Math.max(
      ...loadedSheet.rows.map((r) => r.cells.length),
      loadedSheet.columnWidths?.length || 0,
      sheetMetadata.columnCount
    );

    const widths = new Array(maxCols).fill(CELL_MIN_WIDTH);

    // Use predefined column widths if available
    if (loadedSheet.columnWidths) {
      for (let i = 0; i < loadedSheet.columnWidths.length; i++) {
        const colWidth = loadedSheet.columnWidths[i];
        widths[i] = Math.max(
          CELL_MIN_WIDTH,
          Math.min(typeof colWidth === 'number' && !isNaN(colWidth) ? colWidth : CELL_MIN_WIDTH, CELL_MAX_WIDTH)
        );
      }
    }

    // Auto-adjust column widths based on content (only visible columns)
    for (let colIdx = visibleColRange.start; colIdx < Math.min(visibleColRange.end, maxCols); colIdx++) {
      let maxWidth = widths[colIdx];

      for (let rowIdx = 0; rowIdx < Math.min(loadedSheet.rows.length, 100); rowIdx++) {
        const cell = loadedSheet.rows[rowIdx]?.cells[colIdx];
        if (cell) {
          const text = getCellDisplayValue(cell);
          const estimatedWidth = Math.min(
            CELL_MAX_WIDTH,
            Math.max(text.length * 7 + 16, CELL_MIN_WIDTH)
          );
          maxWidth = Math.max(maxWidth, estimatedWidth);
        }
      }

      widths[colIdx] = Math.max(CELL_MIN_WIDTH, maxWidth || CELL_MIN_WIDTH);
    }

    return widths;
  }, [loadedSheet?.columnWidths, loadedSheet?.rows, sheetMetadata.columnCount, visibleColRange]);

  // Calculate cumulative column positions for total width
  const columnPositions = useMemo(() => {
    const positions = [0];
    for (let i = 0; i < columnWidths.length - 1; i++) {
      positions.push(positions[i] + columnWidths[i]);
    }
    return positions;
  }, [columnWidths]);

  // Handle scroll (both vertical and horizontal virtual scrolling)
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!loadedSheet) return;

      const scrollTop = e.currentTarget.scrollTop;
      const scrollLeft = e.currentTarget.scrollLeft;
      const containerHeight = e.currentTarget.clientHeight;
      const containerWidth = e.currentTarget.clientWidth;

      // Vertical scrolling
      const adjustedScrollTop = Math.max(0, scrollTop - ROW_HEIGHT);
      const startRow = Math.max(0, Math.floor(adjustedScrollTop / ROW_HEIGHT) - VISIBLE_ROWS_BUFFER);
      const endRow = Math.ceil((adjustedScrollTop + containerHeight) / ROW_HEIGHT) + VISIBLE_ROWS_BUFFER;

      setVisibleRowRange({
        start: startRow,
        end: Math.min(endRow, loadedSheet.rows.length),
      });

      // Horizontal scrolling
      let startCol = 0;
      let endCol = columnWidths.length;

      // Find start column
      for (let i = 0; i < columnPositions.length; i++) {
        if (columnPositions[i] + columnWidths[i] >= scrollLeft) {
          startCol = Math.max(0, i - VISIBLE_COLS_BUFFER);
          break;
        }
      }

      // Find end column
      for (let i = startCol; i < columnPositions.length; i++) {
        if (columnPositions[i] >= scrollLeft + containerWidth) {
          endCol = Math.min(i + VISIBLE_COLS_BUFFER, columnWidths.length);
          break;
        }
      }

      setVisibleColRange({ start: startCol, end: endCol });
    },
    [loadedSheet, columnWidths, columnPositions]
  );

  if (isLoading || !loadedSheet) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading sheet...</span>
        </div>
      </div>
    );
  }

  const visibleRows = loadedSheet.rows.slice(visibleRowRange.start, visibleRowRange.end);
  const totalHeight = loadedSheet.rows.length * ROW_HEIGHT;
  const totalWidth = columnPositions[columnPositions.length - 1] + (columnWidths[columnWidths.length - 1] || 0);
  const offsetTop = visibleRowRange.start * ROW_HEIGHT;
  const offsetLeft = columnPositions[visibleColRange.start] || 0;

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-background overflow-hidden"
    >
      {/* Single scrollable container for both header and data */}
      <div
        ref={scrollRef}
        className="h-full w-full overflow-auto"
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight + ROW_HEIGHT, width: totalWidth + 40, position: 'relative' }}>
          {/* Header Row (sticky) */}
          <div 
            className="flex bg-muted/50 border-b sticky top-0 z-10"
            style={{ height: ROW_HEIGHT }}
          >
            {/* Row number header */}
            <div
              className="flex items-center justify-center bg-muted/70 border-r font-semibold text-xs text-muted-foreground flex-shrink-0 sticky left-0 z-20"
              style={{ width: 40, height: ROW_HEIGHT }}
            >
              #
            </div>

            {/* Spacer for columns before visible range */}
            {visibleColRange.start > 0 && (
              <div style={{ width: offsetLeft, flexShrink: 0 }} />
            )}

            {/* Column headers (only visible) */}
            {columnWidths.slice(visibleColRange.start, visibleColRange.end).map((width, idx) => {
              const colIdx = visibleColRange.start + idx;
              const columnLetter = String.fromCharCode(65 + (colIdx % 26));
              const columnLabel =
                colIdx < 26
                  ? columnLetter
                  : String.fromCharCode(65 + Math.floor(colIdx / 26) - 1) + columnLetter;

              return (
                <div
                  key={`header-${colIdx}`}
                  className="flex items-center justify-center bg-muted/70 border-r font-semibold text-xs text-muted-foreground flex-shrink-0"
                  style={{ width, height: ROW_HEIGHT }}
                >
                  {columnLabel}
                </div>
              );
            })}
          </div>

          {/* Spacer for rows before visible range */}
          <div style={{ height: offsetTop }} />

          {/* Visible rows */}
          <div>
            {visibleRows.map((row, relativeIdx) => {
              const absoluteRowIdx = visibleRowRange.start + relativeIdx;
              return (
                <div key={`row-${absoluteRowIdx}`} className="flex border-b">
                  {/* Row number (sticky) */}
                  <div
                    className="flex items-center justify-center bg-muted/20 border-r text-xs text-muted-foreground flex-shrink-0 sticky left-0 z-10"
                    style={{ width: 40, height: ROW_HEIGHT }}
                  >
                    {absoluteRowIdx + 1}
                  </div>

                  {/* Spacer for columns before visible range */}
                  {visibleColRange.start > 0 && (
                    <div style={{ width: offsetLeft, flexShrink: 0 }} />
                  )}

                  {/* Cells (only visible) */}
                  {columnWidths.slice(visibleColRange.start, visibleColRange.end).map((width, idx) => {
                    const colIdx = visibleColRange.start + idx;
                    const cell = row.cells[colIdx];
                    
                    if (!cell) {
                      return (
                        <div
                          key={`empty-${absoluteRowIdx}-${colIdx}`}
                          className="flex items-center px-2 py-1 border-r text-xs bg-background flex-shrink-0"
                          style={{ width, height: ROW_HEIGHT }}
                        />
                      );
                    }

                    return (
                      <ExcelCell
                        key={`cell-${absoluteRowIdx}-${colIdx}`}
                        cell={cell}
                        width={width}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExcelCellProps {
  cell: Cell;
  width: number;
}

function ExcelCell({ cell, width }: ExcelCellProps) {
  const displayValue = getCellDisplayValue(cell);
  const style = cell.style || {};

  // Ensure width is a valid number
  const validWidth = typeof width === 'number' && !isNaN(width) && isFinite(width) ? width : CELL_MIN_WIDTH;

  const cellStyle: React.CSSProperties = {
    width: validWidth,
    height: ROW_HEIGHT,
    minWidth: validWidth,
    maxWidth: validWidth,
    textAlign: (style.alignment || 'left') as any,
    backgroundColor: style.bgColor,
    color: style.textColor,
    fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
    fontFamily: style.fontFamily || 'inherit',
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
  };

  return (
    <div
      className={cn(
        "flex items-center px-2 py-1 border-r text-xs overflow-hidden text-ellipsis whitespace-nowrap",
        "bg-background"
      )}
      style={cellStyle}
      title={displayValue}
    >
      {displayValue}
    </div>
  );
}
