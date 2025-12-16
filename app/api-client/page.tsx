"use client";

import { useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Send,
  Loader2,
  Save,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { KeyValueEditor } from "@/components/api-client/key-value-editor";
import { JsonBodyEditor } from "@/components/api-client/json-body-editor";
import { CollectionsSidebar } from "@/components/api-client/collections-sidebar";
import { SaveRequestDialog } from "@/components/api-client/save-request-dialog";
import { db, addToHistory } from "@/lib/db";
import type {
  HttpMethod,
  KeyValue,
  RequestState,
  ResponseState,
} from "@/lib/api-client/types";
import { cn } from "@/lib/utils";

const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  POST: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  PUT: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  PATCH: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
  DELETE: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  HEAD: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  OPTIONS: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
};

const getStatusColor = (status: number) => {
  if (status >= 200 && status < 300) return "bg-green-500";
  if (status >= 300 && status < 400) return "bg-yellow-500";
  if (status >= 400 && status < 500) return "bg-orange-500";
  if (status >= 500) return "bg-red-500";
  return "bg-gray-500";
};

const createDefaultRequest = (): RequestState & {
  id?: number;
  name?: string;
  collectionId?: number;
  folderId?: number;
} => ({
  method: "GET",
  url: "",
  headers: [],
  params: [],
  body: "",
});

export default function ApiClientPage() {
  const [request, setRequest] = useState(createDefaultRequest());
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [responseHeadersOpen, setResponseHeadersOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const history = useLiveQuery(
    () => db.requestHistory.orderBy("executedAt").reverse().limit(50).toArray(),
    []
  );

  const buildUrl = useCallback(() => {
    if (!request.url) return "";
    try {
      const url = new URL(request.url);
      request.params
        .filter((p) => p.enabled && p.key)
        .forEach((p) => url.searchParams.set(p.key, p.value));
      return url.toString();
    } catch {
      // If URL is invalid, just append params manually
      const params = request.params
        .filter((p) => p.enabled && p.key)
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join("&");
      if (params) {
        return request.url.includes("?")
          ? `${request.url}&${params}`
          : `${request.url}?${params}`;
      }
      return request.url;
    }
  }, [request.url, request.params]);

  const sendRequest = async () => {
    if (!request.url) {
      setError("URL is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const finalUrl = buildUrl();
      const enabledHeaders = request.headers.filter((h) => h.enabled && h.key);

      const proxyResponse = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: finalUrl,
          method: request.method,
          headers: enabledHeaders,
          requestBody: request.body || undefined,
        }),
      });

      const data = await proxyResponse.json();

      if (data.error && data.status === 0) {
        setError(data.error);
      } else {
        const responseHeaders: KeyValue[] = Object.entries(data.headers || {}).map(
          ([key, value]) => ({
            id: crypto.randomUUID(),
            key,
            value: value as string,
            enabled: true,
          })
        );

        const responseData: ResponseState = {
          status: data.status,
          statusText: data.statusText,
          headers: responseHeaders,
          body: data.body,
          time: data.time,
        };

        setResponse(responseData);

        // Add to history
        await addToHistory({
          method: request.method,
          url: finalUrl,
          headers: enabledHeaders,
          params: request.params.filter((p) => p.enabled),
          body: request.body || undefined,
          responseStatus: data.status,
          responseStatusText: data.statusText,
          responseTime: data.time,
          responseBody: data.body,
          responseHeaders,
          executedAt: new Date(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClick = () => {
    setSaveDialogOpen(true);
  };

  const handleSaved = (savedRequest: { id: number; name: string; collectionId: number; folderId?: number }) => {
    setRequest((prev) => ({
      ...prev,
      id: savedRequest.id,
      name: savedRequest.name,
      collectionId: savedRequest.collectionId,
      folderId: savedRequest.folderId,
    }));
  };

  const loadFromHistory = (historyItem: NonNullable<typeof history>[0]) => {
    setRequest({
      method: historyItem.method,
      url: historyItem.url,
      headers: historyItem.headers,
      params: historyItem.params,
      body: historyItem.body || "",
    });
    if (historyItem.responseStatus) {
      setResponse({
        status: historyItem.responseStatus,
        statusText: historyItem.responseStatusText || "",
        headers: historyItem.responseHeaders || [],
        body: historyItem.responseBody || "",
        time: historyItem.responseTime || 0,
      });
    }
  };

  const formatJson = (str: string) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <h1 className="text-lg font-semibold">API Client</h1>
        {request.name && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">{request.name}</span>
          </>
        )}
      </div>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Collections Sidebar */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <div className="h-full flex flex-col border-r">
            <CollectionsSidebar
              onLoadRequest={(req) => {
                setRequest(req);
                setResponse(null);
                setError(null);
              }}
              currentRequestId={request.id}
            />
            <Separator />
            {/* History Section */}
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">History</span>
                  </div>
                  {showHistory ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-48">
                  <div className="p-2 space-y-1">
                    {history?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                        onClick={() => loadFromHistory(item)}
                      >
                        <span
                          className={cn(
                            "text-xs font-mono px-1 rounded",
                            METHOD_COLORS[item.method]
                          )}
                        >
                          {item.method.substring(0, 3)}
                        </span>
                        <span className="text-xs truncate flex-1">
                          {item.url}
                        </span>
                        {item.responseStatus && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              item.responseStatus >= 200 &&
                                item.responseStatus < 300
                                ? "border-green-500 text-green-500"
                                : item.responseStatus >= 400
                                ? "border-red-500 text-red-500"
                                : "border-yellow-500 text-yellow-500"
                            )}
                          >
                            {item.responseStatus}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {(!history || history.length === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No history yet
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Main Panel */}
        <ResizablePanel defaultSize={80}>
          <div className="flex flex-col h-full">
            {/* Request URL Bar */}
            <div className="p-4 border-b">
              <div className="flex gap-2">
                <Select
                  value={request.method}
                  onValueChange={(value: HttpMethod) =>
                    setRequest((prev) => ({ ...prev, method: value }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        <span className={cn("font-mono", METHOD_COLORS[method])}>
                          {method}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter URL"
                  value={request.url}
                  onChange={(e) =>
                    setRequest((prev) => ({ ...prev, url: e.target.value }))
                  }
                  className="flex-1 font-mono"
                  onKeyDown={(e) => e.key === "Enter" && sendRequest()}
                />
                <Button onClick={sendRequest} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-2">Send</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveClick}
                  title="Save request"
                >
                  <Save className="h-4 w-4" />
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}
            </div>

            <ResizablePanelGroup direction="vertical" className="flex-1">
              {/* Request Details */}
              <ResizablePanel defaultSize={50} minSize={20}>
                <Tabs defaultValue="params" className="h-full flex flex-col">
                  <TabsList className="mx-4 mt-2 w-fit">
                    <TabsTrigger value="params">
                      Params
                      {request.params.filter((p) => p.enabled && p.key).length >
                        0 && (
                        <Badge variant="secondary" className="ml-2">
                          {request.params.filter((p) => p.enabled && p.key).length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="headers">
                      Headers
                      {request.headers.filter((h) => h.enabled && h.key).length >
                        0 && (
                        <Badge variant="secondary" className="ml-2">
                          {request.headers.filter((h) => h.enabled && h.key).length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="body">Body</TabsTrigger>
                  </TabsList>
                  <ScrollArea className="flex-1">
                    <TabsContent value="params" className="p-4 m-0">
                      <KeyValueEditor
                        items={request.params}
                        onChange={(params) =>
                          setRequest((prev) => ({ ...prev, params }))
                        }
                        keyPlaceholder="Parameter"
                        valuePlaceholder="Value"
                      />
                    </TabsContent>
                    <TabsContent value="headers" className="p-4 m-0">
                      <KeyValueEditor
                        items={request.headers}
                        onChange={(headers) =>
                          setRequest((prev) => ({ ...prev, headers }))
                        }
                        keyPlaceholder="Header"
                        valuePlaceholder="Value"
                      />
                    </TabsContent>
                    <TabsContent value="body" className="p-4 m-0">
                      <JsonBodyEditor
                        value={request.body}
                        onChange={(body) =>
                          setRequest((prev) => ({ ...prev, body }))
                        }
                      />
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </ResizablePanel>

              <ResizableHandle />

              {/* Response Panel */}
              <ResizablePanel defaultSize={50} minSize={20}>
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="px-4 py-2 border-t flex items-center gap-4 shrink-0">
                    <span className="text-sm font-medium">Response</span>
                    {response && (
                      <>
                        <Badge
                          className={cn(
                            "text-white",
                            getStatusColor(response.status)
                          )}
                        >
                          {response.status} {response.statusText}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {response.time}ms
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      {response ? (
                        <div className="p-4">
                          <Collapsible
                            open={responseHeadersOpen}
                            onOpenChange={setResponseHeadersOpen}
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mb-2"
                              >
                                {responseHeadersOpen ? (
                                  <ChevronUp className="h-4 w-4 mr-2" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 mr-2" />
                                )}
                                Headers ({response.headers.length})
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mb-4">
                              <div className="bg-muted rounded-md p-2 space-y-1">
                                {response.headers.map((header) => (
                                  <div
                                    key={header.id}
                                    className="flex gap-2 text-sm font-mono"
                                  >
                                    <span className="text-muted-foreground">
                                      {header.key}:
                                    </span>
                                    <span className="truncate">{header.value}</span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                          <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
                            {formatJson(response.body)}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <p>Send a request to see the response</p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <SaveRequestDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        request={request}
        onSaved={handleSaved}
        existingRequestId={request.id}
        existingName={request.name}
        existingCollectionId={request.collectionId}
        existingFolderId={request.folderId}
      />
    </div>
  );
}
