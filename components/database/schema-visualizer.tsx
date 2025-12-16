"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DatabaseConnection, TableSchema } from "@/lib/database/types";

interface SchemaVisualizerProps {
  connection: DatabaseConnection;
}

interface TablePosition {
  x: number;
  y: number;
}

const TABLE_WIDTH = 220;
const TABLE_HEADER_HEIGHT = 32;
const COLUMN_HEIGHT = 24;
const TABLE_PADDING = 8;
const GRID_SPACING = 40;

export function SchemaVisualizer({ connection }: SchemaVisualizerProps) {
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, TablePosition>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch schema
  useEffect(() => {
    const fetchSchema = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/database/schema", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: connection.provider,
            host: connection.host,
            port: connection.port,
            database: connection.database,
            username: connection.username,
            password: connection.password,
            sslEnabled: connection.sslEnabled,
            sshTunnel: connection.sshTunnel,
          }),
        });

        const result = await response.json();

        if (result.error) {
          setError(result.error);
        } else {
          setSchema(result.schema);
          // Initialize positions in a grid layout
          const newPositions: Record<string, TablePosition> = {};
          const cols = Math.ceil(Math.sqrt(result.schema.length));
          result.schema.forEach((table: TableSchema, index: number) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const tableHeight = TABLE_HEADER_HEIGHT + table.columns.length * COLUMN_HEIGHT + TABLE_PADDING * 2;
            newPositions[`${table.schema}.${table.name}`] = {
              x: col * (TABLE_WIDTH + GRID_SPACING) + 50,
              y: row * (tableHeight + GRID_SPACING) + 50,
            };
          });
          setPositions(newPositions);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch schema");
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [connection]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tableKey: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const pos = positions[tableKey];
      setDragging(tableKey);
      setDragOffset({
        x: e.clientX / zoom - pos.x,
        y: e.clientY / zoom - pos.y,
      });
    },
    [positions, zoom]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        setPositions((prev) => ({
          ...prev,
          [dragging]: {
            x: e.clientX / zoom - dragOffset.x,
            y: e.clientY / zoom - dragOffset.y,
          },
        }));
      } else if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [dragging, dragOffset, zoom, isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsPanning(false);
  }, []);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0 && !dragging) {
        setIsPanning(true);
        setPanStart({
          x: e.clientX - pan.x,
          y: e.clientY - pan.y,
        });
      }
    },
    [dragging, pan]
  );

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Calculate FK relationships
  const relationships: Array<{
    from: { table: string; column: string };
    to: { table: string; column: string };
  }> = [];

  schema.forEach((table) => {
    table.columns.forEach((col) => {
      if (col.foreignKey) {
        relationships.push({
          from: { table: `${table.schema}.${table.name}`, column: col.name },
          to: {
            table: `${col.foreignKey.schema || table.schema}.${col.foreignKey.table}`,
            column: col.foreignKey.column,
          },
        });
      }
    });
  });

  const getColumnY = (tableKey: string, columnName: string): number => {
    const table = schema.find((t) => `${t.schema}.${t.name}` === tableKey);
    if (!table) return 0;
    const colIndex = table.columns.findIndex((c) => c.name === columnName);
    const pos = positions[tableKey];
    if (!pos) return 0;
    return pos.y + TABLE_HEADER_HEIGHT + colIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2 + TABLE_PADDING;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        {error}
      </div>
    );
  }

  if (schema.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No tables found in this database
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleResetView}>
          <Maximize2 className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {schema.length} tables, {relationships.length} relationships
        </span>
      </div>

      {/* Canvas */}
      <ScrollArea className="flex-1">
        <div
          ref={containerRef}
          className="relative min-h-full bg-muted/30 cursor-grab active:cursor-grabbing"
          style={{
            minWidth: "100%",
            minHeight: "100%",
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              width: "5000px",
              height: "5000px",
            }}
          >
            {/* Draw relationship lines */}
            {relationships.map((rel, index) => {
              const fromPos = positions[rel.from.table];
              const toPos = positions[rel.to.table];
              if (!fromPos || !toPos) return null;

              const fromY = getColumnY(rel.from.table, rel.from.column);
              const toY = getColumnY(rel.to.table, rel.to.column);

              const fromX = fromPos.x + TABLE_WIDTH;
              const toX = toPos.x;

              // Bezier curve control points
              const midX = (fromX + toX) / 2;

              return (
                <g key={index}>
                  <path
                    d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="text-muted-foreground/50"
                  />
                  {/* Arrow at end */}
                  <circle cx={toX} cy={toY} r={4} className="fill-muted-foreground/50" />
                </g>
              );
            })}
          </svg>

          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {schema.map((table) => {
              const tableKey = `${table.schema}.${table.name}`;
              const pos = positions[tableKey];
              if (!pos) return null;

              return (
                <div
                  key={tableKey}
                  className="absolute bg-card border rounded-md shadow-sm select-none"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: TABLE_WIDTH,
                    cursor: dragging === tableKey ? "grabbing" : "grab",
                  }}
                  onMouseDown={(e) => handleMouseDown(e, tableKey)}
                >
                  {/* Table header */}
                  <div className="px-3 py-2 bg-primary text-primary-foreground rounded-t-md font-medium text-sm truncate">
                    {table.name}
                  </div>

                  {/* Columns */}
                  <div className="p-2">
                    {table.columns.map((col) => (
                      <div
                        key={col.name}
                        className="flex items-center gap-2 px-1 py-0.5 text-xs"
                        style={{ height: COLUMN_HEIGHT }}
                      >
                        <span
                          className={`truncate flex-1 ${
                            col.primaryKey
                              ? "font-bold text-yellow-600 dark:text-yellow-400"
                              : col.foreignKey
                              ? "text-blue-600 dark:text-blue-400"
                              : ""
                          }`}
                        >
                          {col.primaryKey && "PK "}
                          {col.foreignKey && "FK "}
                          {col.name}
                        </span>
                        <span className="text-muted-foreground text-[10px] shrink-0">
                          {col.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
