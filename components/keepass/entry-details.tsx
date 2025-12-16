"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Key,
  User,
  Globe,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Clock,
  Tag,
  StickyNote,
} from "lucide-react";
import type { KeePassEntry } from "@/lib/keepass/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EntryDetailsProps {
  entry: KeePassEntry | null;
}

// Clipboard auto-clear timeout (30 seconds)
const CLIPBOARD_CLEAR_TIMEOUT = 30000;

export function EntryDetails({ entry }: EntryDetailsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Reset password visibility when entry changes
  useEffect(() => {
    setShowPassword(false);
  }, [entry?.uuid]);

  const copyToClipboard = useCallback(async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);

      // Clear clipboard after timeout (security measure)
      setTimeout(async () => {
        try {
          // Only clear if the clipboard still contains our text
          const currentText = await navigator.clipboard.readText();
          if (currentText === text) {
            await navigator.clipboard.writeText("");
          }
        } catch {
          // Ignore errors - clipboard might not be accessible
        }
      }, CLIPBOARD_CLEAR_TIMEOUT);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  }, []);

  const openUrl = useCallback((url: string) => {
    // Ensure URL has a protocol
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = "https://" + url;
    }
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  }, []);

  const formatDate = (date?: Date) => {
    if (!date) return "Unknown";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  if (!entry) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Select an entry to view details</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold">{entry.title || "Untitled"}</h2>
          {entry.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Fields */}
        <div className="space-y-4">
          {/* Username */}
          {entry.username && (
            <FieldRow
              icon={<User className="h-4 w-4" />}
              label="Username"
              value={entry.username}
              onCopy={() => copyToClipboard(entry.username, "username")}
              isCopied={copiedField === "username"}
            />
          )}

          {/* Password */}
          {entry.password && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Password</div>
                <div className="flex items-center gap-2">
                  <code
                    className={cn(
                      "flex-1 text-sm font-mono bg-muted px-2 py-1 rounded truncate",
                      !showPassword && "tracking-widest"
                    )}
                  >
                    {showPassword ? entry.password : "••••••••••••"}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => copyToClipboard(entry.password, "password")}
                    title="Copy password"
                  >
                    {copiedField === "password" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clipboard will be cleared after 30 seconds
                </p>
              </div>
            </div>
          )}

          {/* URL */}
          {entry.url && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">URL</div>
                <div className="flex items-center gap-2">
                  <a
                    href={entry.url.startsWith("http") ? entry.url : `https://${entry.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-primary hover:underline truncate"
                  >
                    {entry.url}
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => openUrl(entry.url)}
                    title="Open URL"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => copyToClipboard(entry.url, "url")}
                    title="Copy URL"
                  >
                    {copiedField === "url" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">Notes</div>
                <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {entry.notes}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Metadata */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Created: {formatDate(entry.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Modified: {formatDate(entry.modifiedAt)}</span>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// Helper component for simple fields
function FieldRow({
  icon,
  label,
  value,
  onCopy,
  isCopied,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy: () => void;
  isCopied: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm truncate">{value}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={onCopy}
            title={`Copy ${label.toLowerCase()}`}
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
