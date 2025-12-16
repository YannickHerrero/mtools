// Helper functions for parsing inline markdown (bold, italic, inline code)
export function parseInlineMarkdown(text: string): string {
  let html = text;
  
  // Escape HTML to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Parse inline code first (highest priority)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Parse bold + italic (***text***)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  
  // Parse bold (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Parse italic (*text*)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  return html;
}

// Detect block type from content
export function detectBlockType(content: string): {
  type: 'heading' | 'quote' | 'code' | 'paragraph';
  level?: 1 | 2 | 3;
  cleanContent: string;
} {
  const trimmed = content.trim();
  
  // Detect headings
  if (trimmed.startsWith('### ')) {
    return { type: 'heading', level: 3, cleanContent: trimmed.slice(4) };
  }
  if (trimmed.startsWith('## ')) {
    return { type: 'heading', level: 2, cleanContent: trimmed.slice(3) };
  }
  if (trimmed.startsWith('# ')) {
    return { type: 'heading', level: 1, cleanContent: trimmed.slice(2) };
  }
  
  // Detect quote
  if (trimmed.startsWith('> ')) {
    return { type: 'quote', cleanContent: trimmed.slice(2) };
  }
  
  // Detect code block
  if (trimmed.startsWith('```')) {
    return { type: 'code', cleanContent: trimmed.slice(3) };
  }
  
  // Default to paragraph
  return { type: 'paragraph', cleanContent: content };
}

// Convert block content to display format
export function blockToMarkdown(type: string, content: string, level?: number): string {
  switch (type) {
    case 'heading':
      return `${'#'.repeat(level || 1)} ${content}`;
    case 'quote':
      return `> ${content}`;
    case 'code':
      return `\`\`\`${content}`;
    default:
      return content;
  }
}
