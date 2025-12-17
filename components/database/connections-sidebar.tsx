"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  Database,
  MoreVertical,
  Trash2,
  Plug,
  PlugZap,
  Pencil,
} from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConnectionFormDialog } from "./connection-form-dialog";
import type {
  DatabaseConnection,
  DatabaseConnectionInput,
} from "@/lib/database/types";
import { PROVIDER_LABELS } from "@/lib/database/types";

interface ConnectionsSidebarProps {
  selectedConnection: DatabaseConnection | null;
  connectedConnection: DatabaseConnection | null;
  onSelectConnection: (connection: DatabaseConnection) => void;
  onConnect: (connection: DatabaseConnection) => void;
  onDisconnect: () => void;
}

export function ConnectionsSidebar({
  selectedConnection,
  connectedConnection,
  onSelectConnection,
  onConnect,
  onDisconnect,
}: ConnectionsSidebarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editConnection, setEditConnection] = useState<DatabaseConnection | null>(null);

  const connections = useLiveQuery(() =>
    db.databaseConnections.orderBy("name").toArray()
  );

  const handleSaveConnection = async (input: DatabaseConnectionInput) => {
    // Encrypt the database password
    const passwordResponse = await fetch("/api/database/encrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: input.password }),
    });

    if (!passwordResponse.ok) {
      throw new Error("Failed to encrypt password");
    }

    const { encryptedPassword } = await passwordResponse.json();

    // Prepare SSH tunnel config if enabled
    let sshTunnel = undefined;
    if (input.sshTunnel?.enabled) {
      // Encrypt SSH private key
      const privateKeyResponse = await fetch("/api/database/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: input.sshTunnel.privateKey }),
      });

      if (!privateKeyResponse.ok) {
        throw new Error("Failed to encrypt SSH private key");
      }

      const { encryptedPassword: encryptedPrivateKey } = await privateKeyResponse.json();

      // Encrypt SSH passphrase if provided
      let encryptedPassphrase = undefined;
      if (input.sshTunnel.passphrase) {
        const passphraseResponse = await fetch("/api/database/encrypt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: input.sshTunnel.passphrase }),
        });

        if (!passphraseResponse.ok) {
          throw new Error("Failed to encrypt SSH passphrase");
        }

        const { encryptedPassword: encPassphrase } = await passphraseResponse.json();
        encryptedPassphrase = encPassphrase;
      }

      sshTunnel = {
        enabled: true,
        host: input.sshTunnel.host,
        port: input.sshTunnel.port,
        username: input.sshTunnel.username,
        privateKey: encryptedPrivateKey,
        passphrase: encryptedPassphrase,
      };
    }

    const now = new Date();
    if (editConnection?.id) {
      // Update existing
      await db.databaseConnections.update(editConnection.id, {
        name: input.name,
        provider: input.provider,
        host: input.host,
        port: input.port,
        database: input.database,
        username: input.username,
        password: encryptedPassword,
        sslEnabled: input.sslEnabled,
        sshTunnel,
        updatedAt: now,
      });
    } else {
      // Create new
      await db.databaseConnections.add({
        name: input.name,
        provider: input.provider,
        host: input.host,
        port: input.port,
        database: input.database,
        username: input.username,
        password: encryptedPassword,
        sslEnabled: input.sslEnabled,
        sshTunnel,
        createdAt: now,
        updatedAt: now,
      } as DatabaseConnection);
    }

    setEditConnection(null);
  };

  const handleDeleteConnection = async (id: number) => {
    if (connectedConnection?.id === id) {
      onDisconnect();
    }
    await db.databaseConnections.delete(id);
  };

  const handleEditConnection = async (conn: DatabaseConnection) => {
    try {
      // Decrypt the password
      const passwordResponse = await fetch("/api/database/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedValue: conn.password }),
      });

      if (!passwordResponse.ok) {
        throw new Error("Failed to decrypt password");
      }

      const { decryptedValue: decryptedPassword } = await passwordResponse.json();

      // Decrypt SSH tunnel secrets if present
      let decryptedSshTunnel = conn.sshTunnel;
      if (conn.sshTunnel?.enabled && conn.sshTunnel.privateKey) {
        const privateKeyResponse = await fetch("/api/database/decrypt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encryptedValue: conn.sshTunnel.privateKey }),
        });

        if (!privateKeyResponse.ok) {
          throw new Error("Failed to decrypt SSH private key");
        }

        const { decryptedValue: decryptedPrivateKey } = await privateKeyResponse.json();

        let decryptedPassphrase = "";
        if (conn.sshTunnel.passphrase) {
          const passphraseResponse = await fetch("/api/database/decrypt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ encryptedValue: conn.sshTunnel.passphrase }),
          });

          if (!passphraseResponse.ok) {
            throw new Error("Failed to decrypt SSH passphrase");
          }

          const { decryptedValue } = await passphraseResponse.json();
          decryptedPassphrase = decryptedValue;
        }

        decryptedSshTunnel = {
          ...conn.sshTunnel,
          privateKey: decryptedPrivateKey,
          passphrase: decryptedPassphrase,
        };
      }

      // Set the edit connection with decrypted values
      setEditConnection({
        ...conn,
        password: decryptedPassword,
        sshTunnel: decryptedSshTunnel,
      });
      setDialogOpen(true);
    } catch (error) {
      console.error("Failed to decrypt connection data:", error);
      // Optionally show an error toast/notification here
    }
  };

  const getProviderIcon = () => {
    return <Database className="h-4 w-4" />;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Connections</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setEditConnection(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {connections?.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No connections yet.
              <br />
              Click + to add one.
            </div>
          )}
          {connections?.map((conn) => (
            <div
              key={conn.id}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                selectedConnection?.id === conn.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => onSelectConnection(conn)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getProviderIcon()}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{conn.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {PROVIDER_LABELS[conn.provider]}
                  </div>
                </div>
              </div>

              {connectedConnection?.id === conn.id && (
                <PlugZap className="h-3.5 w-3.5 text-green-500 shrink-0" />
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {connectedConnection?.id === conn.id ? (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDisconnect();
                      }}
                    >
                      <Plug className="mr-2 h-4 w-4" />
                      Disconnect
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onConnect(conn);
                      }}
                    >
                      <PlugZap className="mr-2 h-4 w-4" />
                      Connect
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditConnection(conn);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (conn.id) handleDeleteConnection(conn.id);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      <ConnectionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveConnection}
        editConnection={editConnection}
      />
    </div>
  );
}
