# MTools

A unified toolkit for work management and developer utilities. All data is stored locally in your browser.

## Features

### Task Board

A Kanban-style board for managing your tasks:

- **Five Columns** - Inbox, Todo, Doing, Done, and Archived
- **Drag & Drop** - Reorder tasks within columns or move between columns
- **Quick Capture** - Add tasks directly or via the command menu
- **Task Details** - Click on any task to edit title and description
- **Local Storage** - All tasks persisted locally using IndexedDB

### Notes

A minimal note-taking app with Markdown support:

- **Markdown Editor** - Write in plain text with Markdown formatting
- **Auto-save** - Notes automatically save after 3 seconds of inactivity
- **Collections** - Organize notes into folders/collections
- **Search** - Quickly find notes by title or content
- **Word Count** - Track your writing progress in the footer

### Whiteboard

A drawing canvas powered by Excalidraw for sketches, diagrams, and visual thinking:

- **Drawing Tools** - Shapes, arrows, text, freehand drawing, and more
- **Auto-save** - Whiteboards automatically save as you draw
- **Collections** - Organize whiteboards into collections and folders
- **Search** - Quickly find whiteboards by title
- **Theme Sync** - Canvas background automatically matches app theme (light/dark)

### Bookmarks

A bookmark manager to organize your favorite links:

- **Categories** - Organize bookmarks into custom categories (Work, Code, Personal, etc.)
- **Grid Layout** - Full-page view with responsive grid display
- **Drag & Drop** - Reorder bookmarks within categories
- **Favicons** - Automatically fetches website favicons
- **Search** - Filter bookmarks by title, URL, or description
- **Import/Export** - Backup and restore bookmarks as JSON
- **Quick Access** - Search and open bookmarks directly from the command menu (opens in new window)

### API Client

A fully-featured API testing tool (Postman alternative):

- **HTTP Methods** - Support for GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Request Builder** - Query parameters, headers, and JSON body editor with auto-completion
- **Collections** - Organize requests into collections with nested folders
- **Request History** - Automatically saves last 100 requests for quick access
- **Local Storage** - All data persisted locally using IndexedDB (no cloud required)
- **CORS Proxy** - Built-in proxy to test any external API without CORS issues

### Database Viewer

Browse and query your databases directly from the browser:

- **Multiple Providers** - PostgreSQL, MySQL, and MariaDB support
- **Connection Manager** - Save and manage multiple database connections
- **SSH Tunneling** - Connect securely through SSH tunnels
- **Table Browser** - View all tables with row counts
- **Data Viewer** - Browse table data with pagination, sorting, and filtering
- **Schema Visualizer** - View table schemas with column types and foreign keys
- **Encrypted Storage** - Passwords and SSH keys are encrypted locally

### KeePass Password Manager

A secure password manager for managing KeePass databases (.kdbx files) directly in your browser:

- **KeePass Support** - Open and manage KeePass v2 databases with full encryption support
- **Key File Support** - Optional key file support for two-factor authentication
- **Hierarchy Management** - Browse entries organized in groups and folders
- **Full-Text Search** - Quickly search across all entries in your database
- **Entry Details** - View usernames, passwords, URLs, tags, and notes
- **Secure Clipboard** - Auto-clearing clipboard operations (30 seconds)
- **Multiple Databases** - Manage and unlock multiple KeePass databases simultaneously
- **Client-Side Security** - All decryption happens locally in your browser
- **Lock/Unlock** - Lock databases to free memory while keeping them accessible

## Keyboard Shortcuts

MTools uses a leader key system inspired by Vim. Press `Space` to activate leader mode.

### Global

| Shortcut | Action |
|----------|--------|
| `Space` `Space` | Open Command Menu |
| `Space` `t` | Go to Tasks |
| `Space` `n` | Go to Notes |
| `Space` `w` | Go to Whiteboard |
| `Space` `b` | Go to Bookmarks |
| `Space` `a` | Go to API Client |
| `Space` `d` | Go to Database |
| `Space` `k` | Go to KeePass |
| `Escape` | Cancel leader mode |

### Context-Aware

| Shortcut | Action | Page |
|----------|--------|------|
| `Space` `o` | Create new note | Notes |
| `Space` `s` | Focus search | Notes |
| `Space` `o` | Create new task | Tasks |
| `Cmd/Ctrl + S` | Save note | Notes |
| `Space` `o` | Create new whiteboard | Whiteboard |
| `Space` `s` | Focus search | Whiteboard |
| `Space` `o` | Add new bookmark | Bookmarks |
| `Space` `c` | Add new category | Bookmarks |
| `Space` `s` | Focus search | Bookmarks |
| `Space` `o` | Add database | KeePass |
| `Space` `s` | Focus search | KeePass |
| `Space` `l` | Lock database | KeePass |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: IndexedDB via Dexie.js
- **Drag & Drop**: dnd-kit
- **Theme**: Dark/Light/System mode support

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to access the toolkit.

## Privacy

All data is stored locally in your browser using IndexedDB. Nothing is sent to external servers (except your actual API requests through the proxy).

## License

MIT
