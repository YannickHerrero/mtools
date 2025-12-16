"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  DatabaseConnection,
  TableInfo,
  ColumnInfo,
  QueryFilter,
} from "@/lib/database/types";

interface DataTableProps {
  connection: DatabaseConnection;
  table: TableInfo | null;
}

const PAGE_SIZES = [25, 50, 100];

const FILTER_OPERATORS = [
  { value: "eq", label: "=" },
  { value: "neq", label: "!=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "like", label: "LIKE" },
  { value: "ilike", label: "ILIKE" },
];

export function DataTable({ connection, table }: DataTableProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortColumn, setSortColumn] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<QueryFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter input state
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterOperator, setFilterOperator] = useState<string>("eq");
  const [filterValue, setFilterValue] = useState<string>("");

  const fetchData = useCallback(async () => {
    if (!table) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/database/query", {
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
          table: table.name,
          schema: table.schema,
          page,
          pageSize,
          sortColumn,
          sortDirection,
          filters,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setRows(result.rows);
        setColumns(result.columns);
        setTotalCount(result.totalCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [connection, table, page, pageSize, sortColumn, sortDirection, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when table changes
  useEffect(() => {
    setPage(1);
    setSortColumn(undefined);
    setFilters([]);
  }, [table?.name, table?.schema]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(undefined);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const addFilter = () => {
    if (filterColumn && filterValue) {
      setFilters([
        ...filters,
        {
          column: filterColumn,
          operator: filterOperator as QueryFilter["operator"],
          value: filterValue,
        },
      ]);
      setFilterColumn("");
      setFilterValue("");
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const formatCellValue = (value: unknown): string => {
    if (value === null) return "NULL";
    if (value === undefined) return "";
    if (typeof value === "object") {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  if (!table) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a table to view its data
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Select value={filterColumn} onValueChange={setFilterColumn}>
                  <SelectTrigger className="col-span-1">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.name} value={col.name}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterOperator} onValueChange={setFilterOperator}>
                  <SelectTrigger className="col-span-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFilter()}
                />
              </div>
              <Button size="sm" onClick={addFilter} className="w-full">
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {filters.map((filter, index) => (
          <div
            key={index}
            className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm"
          >
            <span className="font-medium">{filter.column}</span>
            <span className="text-muted-foreground">
              {FILTER_OPERATORS.find((op) => op.value === filter.operator)?.label}
            </span>
            <span>{filter.value}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1"
              onClick={() => removeFilter(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalCount.toLocaleString()} rows
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {error ? (
          <div className="flex items-center justify-center h-full text-destructive">
            {error}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="min-w-full inline-block">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-muted z-[1]">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.name}
                        className="border-b px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/80 whitespace-nowrap"
                        onClick={() => handleSort(col.name)}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({col.type})
                          </span>
                          {sortColumn === col.name ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-muted/50">
                      {columns.map((col) => (
                        <td
                          key={col.name}
                          className="border-b px-3 py-2 whitespace-nowrap max-w-xs truncate"
                          title={formatCellValue(row[col.name])}
                        >
                          <span
                            className={
                              row[col.name] === null
                                ? "text-muted-foreground italic"
                                : ""
                            }
                          >
                            {formatCellValue(row[col.name])}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Pagination */}
      <div className="border-t p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page <= 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
