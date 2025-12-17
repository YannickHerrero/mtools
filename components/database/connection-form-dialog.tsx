"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Database, KeyRound, Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  DatabaseConnection,
  DatabaseConnectionInput,
  DatabaseProvider,
  SSHTunnelInput,
} from "@/lib/database/types";
import { DEFAULT_PORTS, PROVIDER_LABELS } from "@/lib/database/types";

interface ConnectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (connection: DatabaseConnectionInput) => Promise<void>;
  editConnection?: DatabaseConnection | null;
}

const DEFAULT_SSH_TUNNEL: SSHTunnelInput = {
  enabled: false,
  host: "",
  port: 22,
  username: "",
  privateKey: "",
  passphrase: "",
};

// PEM validation patterns for various private key formats
const PEM_PATTERNS = [
  /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]+-----END OPENSSH PRIVATE KEY-----/,
  /-----BEGIN RSA PRIVATE KEY-----[\s\S]+-----END RSA PRIVATE KEY-----/,
  /-----BEGIN DSA PRIVATE KEY-----[\s\S]+-----END DSA PRIVATE KEY-----/,
  /-----BEGIN EC PRIVATE KEY-----[\s\S]+-----END EC PRIVATE KEY-----/,
  /-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/,
  /-----BEGIN ENCRYPTED PRIVATE KEY-----[\s\S]+-----END ENCRYPTED PRIVATE KEY-----/,
];

function isValidPemKey(content: string): boolean {
  const trimmed = content.trim();
  return PEM_PATTERNS.some((pattern) => pattern.test(trimmed));
}

type KeyInputMode = "paste" | "upload";

export function ConnectionFormDialog({
  open,
  onOpenChange,
  onSave,
  editConnection,
}: ConnectionFormDialogProps) {
  const [formData, setFormData] = useState<DatabaseConnectionInput>({
    name: editConnection?.name || "",
    provider: editConnection?.provider || "postgresql",
    host: editConnection?.host || "localhost",
    port: editConnection?.port || DEFAULT_PORTS.postgresql,
    database: editConnection?.database || "",
    username: editConnection?.username || "",
    password: "",
    sslEnabled: editConnection?.sslEnabled ?? false,
    sshTunnel: editConnection?.sshTunnel
      ? { ...editConnection.sshTunnel, privateKey: "", passphrase: "" }
      : { ...DEFAULT_SSH_TUNNEL },
  });
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("connection");
  const [keyInputMode, setKeyInputMode] = useState<KeyInputMode>("paste");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [pemValidationError, setPemValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProviderChange = (provider: DatabaseProvider) => {
    setFormData({
      ...formData,
      provider,
      port: DEFAULT_PORTS[provider],
    });
  };

  const updateSSHTunnel = (updates: Partial<SSHTunnelInput>) => {
    setFormData({
      ...formData,
      sshTunnel: {
        ...formData.sshTunnel!,
        ...updates,
      },
    });
  };

  // Reset form when editConnection changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        name: editConnection?.name || "",
        provider: editConnection?.provider || "postgresql",
        host: editConnection?.host || "localhost",
        port: editConnection?.port || DEFAULT_PORTS[editConnection?.provider || "postgresql"],
        database: editConnection?.database || "",
        username: editConnection?.username || "",
        password: editConnection?.password || "",
        sslEnabled: editConnection?.sslEnabled ?? false,
        sshTunnel: editConnection?.sshTunnel
          ? { ...editConnection.sshTunnel }
          : { ...DEFAULT_SSH_TUNNEL },
      });
      setKeyInputMode("paste");
      setUploadedFileName(null);
      setPemValidationError(null);
      setTestStatus("idle");
      setTestError("");
      setActiveTab("connection");
    }
  }, [open, editConnection]);

  const handlePrivateKeyChange = (value: string) => {
    updateSSHTunnel({ privateKey: value });
    if (value && !isValidPemKey(value)) {
      setPemValidationError("Invalid PEM format. The key should start with '-----BEGIN ... PRIVATE KEY-----'");
    } else {
      setPemValidationError(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (isValidPemKey(content)) {
        updateSSHTunnel({ privateKey: content });
        setUploadedFileName(file.name);
        setPemValidationError(null);
      } else {
        setPemValidationError("Invalid PEM file. The file does not contain a valid private key.");
        setUploadedFileName(null);
      }
    };
    reader.onerror = () => {
      setPemValidationError("Failed to read the file. Please try again.");
      setUploadedFileName(null);
    };
    reader.readAsText(file);
    
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveUploadedFile = () => {
    updateSSHTunnel({ privateKey: "" });
    setUploadedFileName(null);
    setPemValidationError(null);
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestError("");

    try {
      const response = await fetch("/api/database/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: formData.provider,
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          sslEnabled: formData.sslEnabled,
          sshTunnel: formData.sshTunnel?.enabled ? formData.sshTunnel : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestError(result.error || "Connection failed");
      }
    } catch (error) {
      setTestStatus("error");
      setTestError(error instanceof Error ? error.message : "Connection test failed");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
      // Form reset is handled by useEffect when dialog closes
    } catch (error) {
      console.error("Failed to save connection:", error);
    } finally {
      setSaving(false);
    }
  };

  const isDbValid =
    formData.name &&
    formData.host &&
    formData.port &&
    formData.database &&
    formData.username &&
    formData.password;

  const isSshValid =
    !formData.sshTunnel?.enabled ||
    (formData.sshTunnel.host &&
      formData.sshTunnel.port &&
      formData.sshTunnel.username &&
      formData.sshTunnel.privateKey &&
      !pemValidationError);

  const isValid = isDbValid && isSshValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editConnection ? "Edit Connection" : "New Database Connection"}
          </DialogTitle>
          <DialogDescription>
            Configure your database connection and optional SSH tunnel.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connection" className="gap-2">
              <Database className="h-4 w-4" />
              Connection
            </TabsTrigger>
            <TabsTrigger value="ssh" className="gap-2">
              <KeyRound className="h-4 w-4" />
              SSH Tunnel
              {formData.sshTunnel?.enabled && (
                <span className="ml-1 h-2 w-2 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="flex-1 overflow-auto mt-4">
            <div className="grid gap-4 pr-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Connection Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Database"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="provider">Database Type</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(v) => handleProviderChange(v as DatabaseProvider)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 grid gap-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="localhost"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData({ ...formData, port: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="database">Database</Label>
                <Input
                  id="database"
                  value={formData.database}
                  onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                  placeholder="mydb"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="postgres"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ssl"
                  checked={formData.sslEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, sslEnabled: checked === true })
                  }
                />
                <Label htmlFor="ssl" className="text-sm font-normal">
                  Enable SSL
                </Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ssh" className="flex-1 overflow-auto mt-4">
            <div className="grid gap-4 pr-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sshEnabled"
                  checked={formData.sshTunnel?.enabled || false}
                  onCheckedChange={(checked) =>
                    updateSSHTunnel({ enabled: checked === true })
                  }
                />
                <Label htmlFor="sshEnabled" className="text-sm font-normal">
                  Enable SSH Tunnel
                </Label>
              </div>

              {formData.sshTunnel?.enabled ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 grid gap-2">
                      <Label htmlFor="sshHost">SSH Host</Label>
                      <Input
                        id="sshHost"
                        value={formData.sshTunnel?.host || ""}
                        onChange={(e) => updateSSHTunnel({ host: e.target.value })}
                        placeholder="bastion.example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sshPort">SSH Port</Label>
                      <Input
                        id="sshPort"
                        type="number"
                        value={formData.sshTunnel?.port || 22}
                        onChange={(e) =>
                          updateSSHTunnel({ port: parseInt(e.target.value) || 22 })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sshUsername">SSH Username</Label>
                    <Input
                      id="sshUsername"
                      value={formData.sshTunnel?.username || ""}
                      onChange={(e) => updateSSHTunnel({ username: e.target.value })}
                      placeholder="ubuntu"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Private Key (PEM format)</Label>
                    
                    {/* Key input mode tabs */}
                    <Tabs value={keyInputMode} onValueChange={(v) => setKeyInputMode(v as KeyInputMode)} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 h-8">
                        <TabsTrigger value="paste" className="text-xs gap-1.5">
                          <FileText className="h-3 w-3" />
                          Paste Key
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="text-xs gap-1.5">
                          <Upload className="h-3 w-3" />
                          Upload File
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="paste" className="mt-2">
                        <Textarea
                          id="privateKey"
                          value={formData.sshTunnel?.privateKey || ""}
                          onChange={(e) => handlePrivateKeyChange(e.target.value)}
                          placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"}
                          className="font-mono text-xs h-32 resize-none"
                        />
                      </TabsContent>
                      
                      <TabsContent value="upload" className="mt-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pem,.key,.pub,.ppk,*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        
                        {uploadedFileName || formData.sshTunnel?.privateKey ? (
                          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            <span className="text-sm flex-1 truncate">
                              {uploadedFileName || "Key loaded"}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={handleRemoveUploadedFile}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-24 border-dashed"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <Upload className="h-6 w-6" />
                              <span className="text-xs">Click to select a private key file</span>
                              <span className="text-xs text-muted-foreground/70">.pem, .key, or other key files</span>
                            </div>
                          </Button>
                        )}
                      </TabsContent>
                    </Tabs>
                    
                    {/* PEM validation feedback */}
                    {pemValidationError && (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{pemValidationError}</span>
                      </div>
                    )}
                    {formData.sshTunnel?.privateKey && !pemValidationError && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Valid PEM key detected</span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="passphrase">Passphrase (optional)</Label>
                    <Input
                      id="passphrase"
                      type="password"
                      value={formData.sshTunnel?.passphrase || ""}
                      onChange={(e) => updateSSHTunnel({ passphrase: e.target.value })}
                      placeholder="Leave empty if key is not encrypted"
                    />
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Enable SSH tunnel to connect through a bastion/jump host.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Status messages */}
        {testStatus === "success" && (
          <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded">
            Connection successful!
          </div>
        )}
        {testStatus === "error" && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
            {testError}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!isValid || testStatus === "testing"}
          >
            {testStatus === "testing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Connection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
