"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import { Play, History, Loader2, Clock, Hash, AlertCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { format } from "sql-formatter";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  DatabaseConnection,
  RawQueryResult,
  TableSchema,
} from "@/lib/database/types";
import { db, addToQueryHistory } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

interface QueryEditorProps {
  connection: DatabaseConnection;
}

interface QueryResult extends RawQueryResult {
  error?: string;
}

export function QueryEditor({ connection }: QueryEditorProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("SELECT * FROM ");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const monacoRef = useRef<Monaco | null>(null);

  // Load query history
  const queryHistory = useLiveQuery(
    () =>
      db.queryHistory
        .where("connectionId")
        .equals(connection.id!)
        .reverse()
        .limit(50)
        .toArray(),
    [connection.id]
  );

  // Load schema for autocomplete
  useEffect(() => {
    const loadSchema = async () => {
      setLoadingSchema(true);
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

        const data = await response.json();
        if (data.schema) {
          setSchema(data.schema);
        }
      } catch (err) {
        console.error("Failed to load schema:", err);
      } finally {
        setLoadingSchema(false);
      }
    };

    loadSchema();
  }, [connection]);

  // Setup Monaco editor with SQL autocomplete
  const handleEditorDidMount = useCallback(
    (monaco: Monaco) => {
      monacoRef.current = monaco;

      // Register SQL autocomplete
      monaco.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems: (model: Parameters<typeof monaco.languages.registerCompletionItemProvider>[1]['provideCompletionItems'] extends (model: infer M, ...args: any[]) => any ? M : never, position: Parameters<typeof monaco.languages.registerCompletionItemProvider>[1]['provideCompletionItems'] extends (model: any, position: infer P, ...args: any[]) => any ? P : never) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: Array<{
            label: string;
            kind: number;
            insertText: string;
            range: typeof range;
            detail?: string;
          }> = [];

          // Add table suggestions
          schema.forEach((table) => {
            suggestions.push({
              label: table.name,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: table.name,
              range,
              detail: `Table from ${table.schema} schema`,
            });

            // Add column suggestions for each table
            table.columns.forEach((column) => {
              suggestions.push({
                label: `${table.name}.${column.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: `${table.name}.${column.name}`,
                range,
                detail: `${column.type}${
                  column.primaryKey ? " (PK)" : ""
                }${column.nullable ? "" : " NOT NULL"}`,
              });
            });
          });

          // Add SQL keywords
          const keywords = [
            "SELECT",
            "FROM",
            "WHERE",
            "JOIN",
            "LEFT JOIN",
            "RIGHT JOIN",
            "INNER JOIN",
            "OUTER JOIN",
            "ON",
            "AND",
            "OR",
            "NOT",
            "IN",
            "EXISTS",
            "LIKE",
            "BETWEEN",
            "IS NULL",
            "IS NOT NULL",
            "ORDER BY",
            "GROUP BY",
            "HAVING",
            "LIMIT",
            "OFFSET",
            "DISTINCT",
            "AS",
            "UNION",
            "UNION ALL",
            "CASE",
            "WHEN",
            "THEN",
            "ELSE",
            "END",
            "WITH",
          ];

          keywords.forEach((keyword) => {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              range,
            });
          });

          return { suggestions };
        },
      });
    },
    [schema]
  );

  const executeQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    const startTime = Date.now();
    try {
      const response = await fetch("/api/database/execute", {
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
          query,
        }),
      });

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      if (data.error) {
        setResult({ ...data, executionTime });
        // Save to history with error
        await addToQueryHistory({
          connectionId: connection.id!,
          query,
          executedAt: new Date(),
          executionTime,
          rowCount: 0,
          success: false,
          error: data.error,
        });
      } else {
        setResult(data);
        // Save to history
        await addToQueryHistory({
          connectionId: connection.id!,
          query,
          executedAt: new Date(),
          executionTime: data.executionTime,
          rowCount: data.rowCount,
          success: true,
        });
      }
    } catch (err) {
      const executionTime = Date.now() - startTime;
      const errorMsg =
        err instanceof Error ? err.message : "Failed to execute query";
      setResult({
        rows: [],
        columns: [],
        rowCount: 0,
        executionTime,
        error: errorMsg,
      });
      // Save to history with error
      await addToQueryHistory({
        connectionId: connection.id!,
        query,
        executedAt: new Date(),
        executionTime,
        rowCount: 0,
        success: false,
        error: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatQuery = () => {
    try {
      const formatted = format(query, {
        language:
          connection.provider === "postgresql" ? "postgresql" : "mysql",
        tabWidth: 2,
        keywordCase: "upper",
      });
      setQuery(formatted);
    } catch (err) {
      console.error("Failed to format query:", err);
    }
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

  return (
    <div className="flex flex-col h-full">
      {/* Editor Section */}
      <div className="flex-1 border-b flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="border-b p-2 flex items-center gap-2">
          <Button
            onClick={executeQuery}
            disabled={loading || !query.trim()}
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="ml-2">Run (⌘/Ctrl+Enter)</span>
          </Button>

          <Button onClick={formatQuery} variant="outline" size="sm">
            Format
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px]" align="start">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Query History</h4>
                <ScrollArea className="h-[300px]">
                  {queryHistory && queryHistory.length > 0 ? (
                    <div className="space-y-2">
                      {queryHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-2 border rounded hover:bg-muted cursor-pointer text-sm"
                          onClick={() => setQuery(entry.query)}
                        >
                          <div className="font-mono text-xs mb-1 truncate">
                            {entry.query}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {entry.executionTime}ms
                            </span>
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {entry.rowCount} rows
                            </span>
                            {!entry.success && (
                              <span className="flex items-center gap-1 text-destructive">
                                <AlertCircle className="h-3 w-3" />
                                Error
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No query history
                    </div>
                  )}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {loadingSchema && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading autocomplete...
            </div>
          )}
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language="sql"
            value={query}
            onChange={(value) => setQuery(value || "")}
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
            onMount={(editor, monaco) => {
              handleEditorDidMount(monaco);
              
              // Add Cmd/Ctrl+Enter to execute query
              editor.addAction({
                id: "execute-query",
                label: "Execute Query",
                keybindings: [
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                ],
                run: () => {
                  executeQuery();
                },
              });
            }}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {result?.error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h3 className="font-medium text-destructive">
                    Query Error
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.error}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : result && result.rows ? (
          <>
            {/* Results toolbar */}
            <div className="border-b p-2 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{result.rowCount}</span>
                <span className="text-muted-foreground">rows</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{result.executionTime}ms</span>
              </div>
            </div>

            {/* Results table */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="min-w-full inline-block">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-muted z-[1]">
                      <tr>
                        {result.columns.map((col) => (
                          <th
                            key={col.name}
                            className="border-b px-3 py-2 text-left font-medium whitespace-nowrap"
                          >
                            <div className="flex items-center gap-1">
                              <span>{col.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({col.type})
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-muted/50">
                          {result.columns.map((col) => (
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
                      {result.rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={result.columns.length}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No results
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Executing query...
              </div>
            ) : (
              "Run a query to see results"
            )}
          </div>
        )}
      </div>
    </div>
  );
}
