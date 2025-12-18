"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database,
  Table2,
  GitBranch,
  Code2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useLeaderKeyContext } from "@/components/providers/leader-key-provider";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConnectionsSidebar } from "@/components/database/connections-sidebar";
import { DataTable } from "@/components/database/data-table";
import { SchemaVisualizer } from "@/components/database/schema-visualizer";
import { QueryEditor } from "@/components/database/query-editor";
import type { DatabaseConnection, TableInfo } from "@/lib/database/types";
import { PROVIDER_LABELS } from "@/lib/database/types";

export default function DatabasePage() {
  const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(null);
  const [connectedConnection, setConnectedConnection] = useState<DatabaseConnection | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("data");

  const { registerContextActions } = useLeaderKeyContext();

  // Register leader key shortcuts
  useEffect(() => {
    registerContextActions([]);
    return () => registerContextActions([]);
  }, [registerContextActions]);

  // Fetch tables when connection changes
  const fetchTables = useCallback(async (connection: DatabaseConnection) => {
    setLoadingTables(true);
    setTablesError(null);
    setTables([]);
    setSelectedTable(null);

    try {
      const response = await fetch("/api/database/tables", {
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
        setTablesError(result.error);
      } else {
        setTables(result.tables);
      }
    } catch (err) {
      setTablesError(err instanceof Error ? err.message : "Failed to fetch tables");
    } finally {
      setLoadingTables(false);
    }
  }, []);

  const handleConnect = useCallback(
    async (connection: DatabaseConnection) => {
      setConnectedConnection(connection);
      setSelectedConnection(connection);
      await fetchTables(connection);
    },
    [fetchTables]
  );

  const handleDisconnect = useCallback(() => {
    setConnectedConnection(null);
    setTables([]);
    setSelectedTable(null);
    setTablesError(null);
  }, []);

  // Group tables by schema
  const tablesBySchema = tables.reduce((acc, table) => {
    const schema = table.schema || "public";
    if (!acc[schema]) acc[schema] = [];
    acc[schema].push(table);
    return acc;
  }, {} as Record<string, TableInfo[]>);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <Database className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Database</h1>
        {connectedConnection && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {connectedConnection.name}
            </span>
            <span className="text-xs bg-muted px-2 py-0.5 rounded">
              {PROVIDER_LABELS[connectedConnection.provider]}
            </span>
          </>
        )}
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Connections Sidebar */}
        <ResizablePanel defaultSize={15} minSize={12} maxSize={25}>
          <ConnectionsSidebar
            selectedConnection={selectedConnection}
            connectedConnection={connectedConnection}
            onSelectConnection={setSelectedConnection}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </ResizablePanel>

        <ResizableHandle />

        {/* Tables List */}
        <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
          <div className="h-full flex flex-col border-r">
            <div className="p-2 border-b">
              <span className="text-sm font-medium">Tables</span>
            </div>

            {!connectedConnection ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
                Connect to a database to view tables
              </div>
            ) : loadingTables ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tablesError ? (
              <div className="flex-1 flex items-center justify-center text-sm text-destructive p-4 text-center">
                {tablesError}
              </div>
            ) : tables.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
                No tables found
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {Object.entries(tablesBySchema).map(([schema, schemaTables]) => (
                    <div key={schema}>
                      <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                        {schema}
                      </div>
                      <div className="space-y-0.5">
                        {schemaTables.map((table) => (
                          <div
                            key={`${table.schema}.${table.name}`}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm ${
                              selectedTable?.name === table.name &&
                              selectedTable?.schema === table.schema
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-muted"
                            }`}
                            onClick={() => {
                              setSelectedTable(table);
                              setActiveTab("data");
                            }}
                          >
                            <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate flex-1">{table.name}</span>
                            {table.rowCount !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {table.rowCount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Main Content */}
        <ResizablePanel defaultSize={70}>
          {!connectedConnection ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Database className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">No database connected</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Select a connection from the sidebar and click connect, or add a new
                connection to get started.
              </p>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              <div className="border-b px-4">
                <TabsList className="h-10">
                  <TabsTrigger value="data" className="gap-2">
                    <Table2 className="h-4 w-4" />
                    Data
                  </TabsTrigger>
                  <TabsTrigger value="query" className="gap-2">
                    <Code2 className="h-4 w-4" />
                    Query
                  </TabsTrigger>
                  <TabsTrigger value="schema" className="gap-2">
                    <GitBranch className="h-4 w-4" />
                    Schema
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="data" className="flex-1 m-0 overflow-hidden">
                <DataTable connection={connectedConnection} table={selectedTable} />
              </TabsContent>

              <TabsContent value="query" className="flex-1 m-0 overflow-hidden">
                <QueryEditor connection={connectedConnection} />
              </TabsContent>

              <TabsContent value="schema" className="flex-1 m-0 overflow-hidden">
                <SchemaVisualizer connection={connectedConnection} />
              </TabsContent>
            </Tabs>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
