"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { KeyValue } from "@/lib/api-client/types";

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: KeyValueEditorProps) {
  const addItem = () => {
    onChange([
      ...items,
      { id: crypto.randomUUID(), key: "", value: "", enabled: true },
    ]);
  };

  const updateItem = (id: string, field: keyof KeyValue, value: string | boolean) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
        <div className="w-6" />
        <div>{keyPlaceholder}</div>
        <div>{valuePlaceholder}</div>
        <div className="w-8" />
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center"
        >
          <Checkbox
            checked={item.enabled}
            onCheckedChange={(checked: boolean) =>
              updateItem(item.id, "enabled", checked === true)
            }
          />
          <Input
            placeholder={keyPlaceholder}
            value={item.key}
            onChange={(e) => updateItem(item.id, "key", e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder={valuePlaceholder}
            value={item.value}
            onChange={(e) => updateItem(item.id, "value", e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => removeItem(item.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add
      </Button>
    </div>
  );
}
