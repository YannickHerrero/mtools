"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import { getCellDisplayValue } from "@/lib/excel/parser";
import type { Sheet, Cell } from "@/lib/excel/types";
import { cn } from "@/lib/utils";

interface SheetViewerProps {
  sheet: Sheet;
}

const ROW_HEIGHT = 24;
const CELL_MIN_WIDTH = 50;
const CELL_MAX_WIDTH = 250;
const VISIBLE_ROWS_BUFFER = 5;

export function SheetViewer({ sheet }: SheetViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleRowRange, setVisibleRowRange] = useState({ start: 0, end: 50 });

  // Calculate column widths
  const columnWidths = useMemo(() => {
    if (!sheet.rows || sheet.rows.length === 0) return [CELL_MIN_WIDTH];

    const maxCols = Math.max(
      ...sheet.rows.map((r) => r.cells.length),
      sheet.columnWidths?.length || 0,
      1 // Ensure at least 1 column
    );

    const widths = new Array(maxCols).fill(CELL_MIN_WIDTH);

    // Use predefined column widths if available
    if (sheet.columnWidths) {
      for (let i = 0; i < sheet.columnWidths.length; i++) {
        const colWidth = sheet.columnWidths[i];
        widths[i] = Math.max(
          CELL_MIN_WIDTH,
          Math.min(typeof colWidth === 'number' && !isNaN(colWidth) ? colWidth : CELL_MIN_WIDTH, CELL_MAX_WIDTH)
        );
      }
    }

    // Auto-adjust column widths based on content
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      let maxWidth = widths[colIdx];

      for (let rowIdx = 0; rowIdx < Math.min(sheet.rows.length, 100); rowIdx++) {
        const cell = sheet.rows[rowIdx]?.cells[colIdx];
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
  }, [sheet.columnWidths, sheet.rows]);

  // Calculate cumulative column positions for total width
  const columnPositions = useMemo(() => {
    const positions = [0];
    for (let i = 0; i < columnWidths.length - 1; i++) {
      positions.push(positions[i] + columnWidths[i]);
    }
    return positions;
  }, [columnWidths]);

  // Handle scroll (vertical virtual scrolling)
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      const containerHeight = e.currentTarget.clientHeight;

      // Account for header height in scroll calculations
      const adjustedScrollTop = Math.max(0, scrollTop - ROW_HEIGHT);
      const startRow = Math.max(0, Math.floor(adjustedScrollTop / ROW_HEIGHT) - VISIBLE_ROWS_BUFFER);
      const endRow = Math.ceil((adjustedScrollTop + containerHeight) / ROW_HEIGHT) + VISIBLE_ROWS_BUFFER;

      setVisibleRowRange({
        start: startRow,
        end: Math.min(endRow, sheet.rows.length),
      });
    },
    [sheet.rows.length]
  );

  const visibleRows = sheet.rows.slice(visibleRowRange.start, visibleRowRange.end);
  const totalHeight = sheet.rows.length * ROW_HEIGHT;
  const totalWidth = columnPositions[columnPositions.length - 1] + (columnWidths[columnWidths.length - 1] || 0);
  const offsetTop = visibleRowRange.start * ROW_HEIGHT;

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
              className="flex items-center justify-center bg-muted/70 border-r font-semibold text-xs text-muted-foreground flex-shrink-0"
              style={{ width: 40, height: ROW_HEIGHT }}
            >
              #
            </div>

            {/* Column headers */}
            {columnWidths.map((width, colIdx) => {
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
                  {/* Row number */}
                  <div
                    className="flex items-center justify-center bg-muted/20 border-r text-xs text-muted-foreground flex-shrink-0"
                    style={{ width: 40, height: ROW_HEIGHT }}
                  >
                    {absoluteRowIdx + 1}
                  </div>

                  {/* Cells */}
                  {columnWidths.map((width, colIdx) => {
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
