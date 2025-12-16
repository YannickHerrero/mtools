"use client";

import { useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";

interface JsonBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const BRACKET_PAIRS: Record<string, string> = {
  "{": "}",
  "[": "]",
  '"': '"',
};

const CLOSING_BRACKETS = new Set(["}", "]", '"']);

export function JsonBodyEditor({
  value,
  onChange,
  placeholder = '{\n  "key": "value"\n}',
}: JsonBodyEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const currentValue = value;

      // Handle Tab key for indentation
      if (e.key === "Tab") {
        e.preventDefault();
        const newValue =
          currentValue.substring(0, selectionStart) +
          "  " +
          currentValue.substring(selectionEnd);
        onChange(newValue);
        // Set cursor position after the tab
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
        });
        return;
      }

      // Handle auto-closing brackets and quotes
      if (BRACKET_PAIRS[e.key]) {
        const closingChar = BRACKET_PAIRS[e.key];
        
        // For quotes, check if we're closing an existing quote
        if (e.key === '"') {
          const charAfter = currentValue[selectionStart];
          if (charAfter === '"') {
            // Skip over the closing quote
            e.preventDefault();
            requestAnimationFrame(() => {
              textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
            });
            return;
          }
        }

        e.preventDefault();
        const newValue =
          currentValue.substring(0, selectionStart) +
          e.key +
          closingChar +
          currentValue.substring(selectionEnd);
        onChange(newValue);
        // Place cursor between the brackets
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
        });
        return;
      }

      // Handle skipping over closing brackets
      if (CLOSING_BRACKETS.has(e.key)) {
        const charAfter = currentValue[selectionStart];
        if (charAfter === e.key) {
          e.preventDefault();
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
          });
          return;
        }
      }

      // Handle Enter key for auto-indentation
      if (e.key === "Enter") {
        const lineStart = currentValue.lastIndexOf("\n", selectionStart - 1) + 1;
        const currentLine = currentValue.substring(lineStart, selectionStart);
        const indentMatch = currentLine.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1] : "";
        
        const charBefore = currentValue[selectionStart - 1];
        const charAfter = currentValue[selectionStart];
        
        // If cursor is between { and } or [ and ], add extra indentation
        if (
          (charBefore === "{" && charAfter === "}") ||
          (charBefore === "[" && charAfter === "]")
        ) {
          e.preventDefault();
          const newValue =
            currentValue.substring(0, selectionStart) +
            "\n" +
            currentIndent +
            "  " +
            "\n" +
            currentIndent +
            currentValue.substring(selectionEnd);
          onChange(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd =
              selectionStart + 1 + currentIndent.length + 2;
          });
          return;
        }

        // Normal enter with same indentation
        e.preventDefault();
        const newValue =
          currentValue.substring(0, selectionStart) +
          "\n" +
          currentIndent +
          currentValue.substring(selectionEnd);
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd =
            selectionStart + 1 + currentIndent.length;
        });
        return;
      }

      // Handle Backspace for removing paired brackets
      if (e.key === "Backspace" && selectionStart === selectionEnd) {
        const charBefore = currentValue[selectionStart - 1];
        const charAfter = currentValue[selectionStart];
        
        if (
          BRACKET_PAIRS[charBefore] &&
          BRACKET_PAIRS[charBefore] === charAfter
        ) {
          e.preventDefault();
          const newValue =
            currentValue.substring(0, selectionStart - 1) +
            currentValue.substring(selectionEnd + 1);
          onChange(newValue);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;
          });
          return;
        }
      }
    },
    [value, onChange]
  );

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="font-mono text-sm min-h-[200px] resize-y"
      spellCheck={false}
    />
  );
}
