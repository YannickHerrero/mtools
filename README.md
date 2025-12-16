# MTools

A unified toolkit for work management and developer utilities.

## Features

### API Client (Postman Alternative)

A fully-featured API testing tool that runs locally in your browser:

- **HTTP Methods** - Support for GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Request Builder** - Query parameters, headers, and JSON body editor with auto-completion
- **Collections** - Organize requests into collections with nested folders
- **Request History** - Automatically saves last 100 requests for quick access
- **Local Storage** - All data persisted locally using IndexedDB (no cloud required)
- **CORS Proxy** - Built-in proxy to test any external API without CORS issues

### Task Board (Coming Soon)

A Trello-like kanban board for personal task management.

### Notes (Coming Soon)

A minimal note-taking app for quick capture.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: IndexedDB via Dexie.js
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
