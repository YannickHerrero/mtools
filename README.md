# MTools

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://mtools-rho.vercel.app)

> A privacy-first developer toolkit that runs entirely in your browser. No accounts, no cloud sync, no telemetry - just tools that work.

## Highlights

- **8 productivity tools** in one unified interface
- **100% local storage** - all data stays in your browser (IndexedDB)
- **Vim-style navigation** - leader key system for keyboard-driven workflows
- **No account required** - start using immediately, no sign-up needed
- **Encrypted secrets** - database passwords and credentials encrypted at rest
- **Dark/Light/System themes** - seamless theme switching across all tools

## Overview

MTools consolidates essential developer utilities into a single, self-hosted web application. Instead of juggling between Postman, database GUIs, password managers, and note-taking apps, MTools brings them together with a consistent interface and keyboard-first design.

**Built for developers who value:**
- Privacy and data ownership
- Keyboard-driven workflows
- Minimal, focused interfaces
- Self-hosted solutions

**Try it now:** [mtools-rho.vercel.app](https://mtools-rho.vercel.app)

## Features

### Development Tools

#### API Client
A Postman alternative for testing REST APIs:
- HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- Request builder with query params, headers, and JSON body (Monaco editor)
- Organize requests into collections and folders
- Collection-level authentication (Bearer, Basic, API Key)
- Request history (last 100 requests)
- Built-in CORS proxy for testing external APIs

#### Database Viewer
Browse and query databases directly from the browser:
- PostgreSQL, MySQL, and MariaDB support
- SSH tunneling for secure connections
- Table browser with row counts and schema visualization
- Data viewer with pagination, sorting, and filtering
- SQL query editor with syntax highlighting and history
- Encrypted credential storage

### Productivity

#### Tasks
Kanban-style task board:
- Five columns: Inbox, Todo, Doing, Done, Archived
- Drag & drop reordering
- Quick capture via command menu

#### Notes
Markdown note-taking:
- Monaco-based editor with live preview
- Auto-save after 3 seconds of inactivity
- Organize into collections and folders
- Full-text search

#### Whiteboard
Excalidraw-powered drawing canvas:
- Shapes, arrows, text, freehand drawing
- Auto-save as you draw
- Theme-synced canvas (light/dark)
- Organize into collections

### Organization

#### Bookmarks
Link manager with categories:
- Custom categories with drag & drop reordering
- Auto-fetched favicons
- Search by title, URL, or description
- Import/Export as JSON

#### Excel Viewer
Client-side spreadsheet viewer:
- Supports .xlsx, .xls, .xlsm
- Web Worker parsing (non-blocking)
- Multi-sheet navigation

### Security

#### KeePass Manager
Password manager for .kdbx files:
- KeePass v2/v4 support with Argon2
- Key file two-factor authentication
- Quick unlock with PIN
- Auto-clearing clipboard (30 seconds)
- Auto-lock after 30 minutes of inactivity
- All decryption happens client-side

## Keyboard Shortcuts

MTools uses a leader key system inspired by Vim. Press `Space` to activate leader mode, then press a key to execute an action.

### Navigation

| Shortcut | Action |
|----------|--------|
| `Space` `Space` | Open Command Menu |
| `Space` `a` | Go to API Client |
| `Space` `b` | Go to Bookmarks |
| `Space` `d` | Go to Database |
| `Space` `e` | Go to Excel |
| `Space` `k` | Go to KeePass |
| `Space` `n` | Go to Notes |
| `Space` `t` | Go to Tasks |
| `Space` `w` | Go to Whiteboard |
| `Escape` | Cancel leader mode |

### Context-Aware

| Shortcut | Context | Action |
|----------|---------|--------|
| `Space` `o` | Most pages | Create new item |
| `Space` `s` | Most pages | Focus search |
| `Space` `c` | Bookmarks | Add new category |
| `Space` `l` | KeePass | Lock database |
| `Cmd/Ctrl + S` | Notes | Save note |

## Installation

```bash
# Clone the repository
git clone https://github.com/YannickHerrero/mtools.git
cd mtools

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:5175](http://localhost:5175) to access MTools.

### Environment Variables

For database connections with encrypted credentials:

```bash
DATABASE_ENCRYPTION_KEY=your-32-byte-hex-key
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | shadcn/ui + Tailwind CSS 4 |
| Storage | IndexedDB via Dexie.js |
| Editor | Monaco Editor |
| Drawing | Excalidraw |
| Drag & Drop | dnd-kit |
| Database Drivers | postgres, mariadb |
| SSH | ssh2, tunnel-ssh |
| KeePass | kdbxweb, hash-wasm (Argon2) |
| Excel | SheetJS (xlsx) |

## Privacy

MTools is designed with privacy as a core principle:

- **Local-first**: All data stored in browser IndexedDB
- **No telemetry**: Zero tracking or analytics
- **No accounts**: No sign-up, no cloud sync
- **Encrypted secrets**: Database passwords encrypted with AES-GCM
- **Client-side crypto**: KeePass decryption happens entirely in your browser

The only network requests made are:
1. Your actual API requests (through the CORS proxy)
2. Database queries (to your own databases)
3. Favicon fetches for bookmarks

## Contributing

Contributions are welcome! Feel free to:

- [Open an issue](https://github.com/YannickHerrero/mtools/issues) for bugs or feature requests
- Submit a pull request

## License

MIT
