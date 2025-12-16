"use client";

import { useState } from "react";
import { Key } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/db";
import type { AuthType, CollectionAuth } from "@/lib/api-client/types";

interface CollectionAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: number;
  collectionName: string;
  currentAuth?: CollectionAuth;
}

function CollectionAuthDialogContent({
  onOpenChange,
  collectionId,
  collectionName,
  currentAuth,
}: Omit<CollectionAuthDialogProps, "open">) {
  const [authType, setAuthType] = useState<AuthType>(currentAuth?.type || "none");
  const [bearerToken, setBearerToken] = useState(currentAuth?.bearer?.token || "");
  const [basicUsername, setBasicUsername] = useState(currentAuth?.basic?.username || "");
  const [basicPassword, setBasicPassword] = useState(currentAuth?.basic?.password || "");
  const [apiKeyKey, setApiKeyKey] = useState(currentAuth?.apiKey?.key || "");
  const [apiKeyValue, setApiKeyValue] = useState(currentAuth?.apiKey?.value || "");
  const [apiKeyAddTo, setApiKeyAddTo] = useState<"header" | "query">(currentAuth?.apiKey?.addTo || "header");

  const handleSave = async () => {
    let auth: CollectionAuth | undefined;

    if (authType === "bearer" && bearerToken.trim()) {
      auth = {
        type: "bearer",
        bearer: { token: bearerToken.trim() },
      };
    } else if (authType === "basic" && basicUsername.trim()) {
      auth = {
        type: "basic",
        basic: { username: basicUsername.trim(), password: basicPassword },
      };
    } else if (authType === "apiKey" && apiKeyKey.trim() && apiKeyValue.trim()) {
      auth = {
        type: "apiKey",
        apiKey: { key: apiKeyKey.trim(), value: apiKeyValue.trim(), addTo: apiKeyAddTo },
      };
    } else if (authType === "none") {
      auth = { type: "none" };
    }

    await db.collections.update(collectionId, {
      auth,
      updatedAt: new Date(),
    });

    onOpenChange(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Authorization
        </DialogTitle>
        <DialogDescription>
          Configure authorization for all requests in &quot;{collectionName}&quot;.
          This will be automatically applied to every request in this collection.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label>Auth Type</Label>
          <Select value={authType} onValueChange={(v: AuthType) => setAuthType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Auth</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
              <SelectItem value="apiKey">API Key</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {authType === "bearer" && (
          <div className="grid gap-2">
            <Label htmlFor="bearer-token">Token</Label>
            <Input
              id="bearer-token"
              type="password"
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              placeholder="Enter your bearer token"
            />
            <p className="text-xs text-muted-foreground">
              Will be sent as: Authorization: Bearer &lt;token&gt;
            </p>
          </div>
        )}

        {authType === "basic" && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="basic-username">Username</Label>
              <Input
                id="basic-username"
                value={basicUsername}
                onChange={(e) => setBasicUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="basic-password">Password</Label>
              <Input
                id="basic-password"
                type="password"
                value={basicPassword}
                onChange={(e) => setBasicPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Will be sent as: Authorization: Basic &lt;base64(username:password)&gt;
            </p>
          </>
        )}

        {authType === "apiKey" && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="api-key-key">Key</Label>
              <Input
                id="api-key-key"
                value={apiKeyKey}
                onChange={(e) => setApiKeyKey(e.target.value)}
                placeholder="e.g., X-API-Key"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="api-key-value">Value</Label>
              <Input
                id="api-key-value"
                type="password"
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
                placeholder="Your API key value"
              />
            </div>
            <div className="grid gap-2">
              <Label>Add to</Label>
              <Select value={apiKeyAddTo} onValueChange={(v: "header" | "query") => setApiKeyAddTo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">Header</SelectItem>
                  <SelectItem value="query">Query Params</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {authType === "none" && (
          <p className="text-sm text-muted-foreground">
            No authorization will be added to requests in this collection.
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </DialogFooter>
    </>
  );
}

export function CollectionAuthDialog({
  open,
  onOpenChange,
  ...props
}: CollectionAuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {open && (
          <CollectionAuthDialogContent onOpenChange={onOpenChange} {...props} />
        )}
      </DialogContent>
    </Dialog>
  );
}
