"use client";

import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({ content, onChange, placeholder = "Start typing..." }: MarkdownEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Switch to edit mode when content is empty on mount
  useEffect(() => {
    if (!content && mode === "preview") {
      setMode("edit");
      textareaRef.current?.focus();
    }
  }, [content, mode]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleTextareaBlur = () => {
    // Switch to preview mode when losing focus
    if (content.trim()) {
      setMode("preview");
    }
  };

  const handlePreviewClick = () => {
    // Switch to edit mode when clicking preview
    setMode("edit");
    // Focus textarea on next tick
    setTimeout(() => {
      textareaRef.current?.focus();
      // Move cursor to end
      const len = textareaRef.current?.value.length || 0;
      textareaRef.current?.setSelectionRange(len, len);
    }, 0);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab key to insert spaces instead of losing focus
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = content.substring(0, start) + "  " + content.substring(end);
      onChange(newValue);
      
      // Move cursor after the inserted spaces
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  // Custom components for react-markdown with styling
  const markdownComponents: Components = {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold mb-4 mt-6">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-bold mb-3 mt-5">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-bold mb-2 mt-4">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-bold mb-2 mt-3">{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-base font-bold mb-2 mt-3">{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm font-bold mb-2 mt-3">{children}</h6>
    ),
    p: ({ children }) => (
      <p className="mb-4 leading-7">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-muted-foreground pl-4 italic text-muted-foreground my-4">
        {children}
      </blockquote>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-7">{children}</li>
    ),
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          className="rounded-md my-4"
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code className="inline-code bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-muted rounded-md p-4 overflow-x-auto my-4">
        {children}
      </pre>
    ),
    a: ({ children, href }) => (
      <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    hr: () => (
      <hr className="my-8 border-border" />
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-border">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 bg-muted font-semibold text-left">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 border-t border-border">
        {children}
      </td>
    ),
  };

  return (
    <div className="h-full w-full">
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onBlur={handleTextareaBlur}
          onKeyDown={handleTextareaKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full h-full resize-none outline-none bg-transparent",
            "font-mono text-sm leading-7",
            "px-4 py-4"
          )}
        />
      ) : (
        <div
          onClick={handlePreviewClick}
          className={cn(
            "w-full h-full cursor-text overflow-auto",
            "px-4 py-4",
            "prose prose-neutral dark:prose-invert max-w-none"
          )}
        >
          {content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">{placeholder}</p>
          )}
        </div>
      )}
    </div>
  );
}
