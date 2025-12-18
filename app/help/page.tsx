"use client";

import { useState } from "react";
import { Bookmark, Keyboard, Navigation, Database, Layers, StickyNote, Send, HelpCircle, PenTool, KeyRound, Download, Upload, HardDrive } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/components/export-import/export-dialog";
import { ImportDialog } from "@/components/export-import/import-dialog";

export default function HelpPage() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Help</h1>
      </div>
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6 space-y-8">
          {/* Introduction */}
          <section>
            <p className="text-muted-foreground">
              MTools is a unified toolkit for work management and developer utilities. 
              All your data is stored locally in your browser using IndexedDB - nothing is sent to external servers.
            </p>
          </section>

          <Separator />

          {/* Keyboard Shortcuts */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              MTools uses a leader key system inspired by Vim. Press <Kbd>Space</Kbd> to activate leader mode, 
              then press the corresponding key for the action you want to perform.
            </p>

            {/* Global Shortcuts */}
            <div className="space-y-2">
              <h3 className="font-medium">Global Shortcuts</h3>
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Shortcut</th>
                      <th className="px-4 py-2 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>Space</Kbd></td>
                      <td className="px-4 py-2">Open Command Menu</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>t</Kbd></td>
                      <td className="px-4 py-2">Go to Tasks</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>n</Kbd></td>
                      <td className="px-4 py-2">Go to Notes</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>w</Kbd></td>
                      <td className="px-4 py-2">Go to Whiteboard</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>a</Kbd></td>
                      <td className="px-4 py-2">Go to API Client</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>d</Kbd></td>
                      <td className="px-4 py-2">Go to Database</td>
                    </tr>
                    <tr className="border-b">
                       <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>b</Kbd></td>
                       <td className="px-4 py-2">Go to Bookmarks</td>
                     </tr>
                     <tr className="border-b">
                       <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>k</Kbd></td>
                       <td className="px-4 py-2">Go to KeePass</td>
                     </tr>
                     <tr>
                       <td className="px-4 py-2"><Kbd>Escape</Kbd></td>
                       <td className="px-4 py-2">Cancel leader mode</td>
                     </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Context Shortcuts */}
            <div className="space-y-2">
              <h3 className="font-medium">Context-Aware Shortcuts</h3>
              <p className="text-sm text-muted-foreground">
                These shortcuts are available only on specific pages.
              </p>
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Shortcut</th>
                      <th className="px-4 py-2 text-left font-medium">Action</th>
                      <th className="px-4 py-2 text-left font-medium">Page</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>o</Kbd></td>
                      <td className="px-4 py-2">Create new note</td>
                      <td className="px-4 py-2 text-muted-foreground">Notes</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>s</Kbd></td>
                      <td className="px-4 py-2">Focus search</td>
                      <td className="px-4 py-2 text-muted-foreground">Notes</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>o</Kbd></td>
                      <td className="px-4 py-2">Create new task</td>
                      <td className="px-4 py-2 text-muted-foreground">Tasks</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Cmd/Ctrl</Kbd> + <Kbd>S</Kbd></td>
                      <td className="px-4 py-2">Save note</td>
                      <td className="px-4 py-2 text-muted-foreground">Notes</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>o</Kbd></td>
                      <td className="px-4 py-2">Create new whiteboard</td>
                      <td className="px-4 py-2 text-muted-foreground">Whiteboard</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>s</Kbd></td>
                      <td className="px-4 py-2">Focus search</td>
                      <td className="px-4 py-2 text-muted-foreground">Whiteboard</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>o</Kbd></td>
                      <td className="px-4 py-2">Add new bookmark</td>
                      <td className="px-4 py-2 text-muted-foreground">Bookmarks</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>c</Kbd></td>
                      <td className="px-4 py-2">Add new category</td>
                      <td className="px-4 py-2 text-muted-foreground">Bookmarks</td>
                    </tr>
                     <tr className="border-b">
                       <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>s</Kbd></td>
                       <td className="px-4 py-2">Focus search</td>
                       <td className="px-4 py-2 text-muted-foreground">Bookmarks</td>
                     </tr>
                     <tr className="border-b">
                       <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>o</Kbd></td>
                       <td className="px-4 py-2">Add database</td>
                       <td className="px-4 py-2 text-muted-foreground">KeePass</td>
                     </tr>
                     <tr className="border-b">
                       <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>s</Kbd></td>
                       <td className="px-4 py-2">Focus search</td>
                       <td className="px-4 py-2 text-muted-foreground">KeePass</td>
                     </tr>
                     <tr>
                       <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>l</Kbd></td>
                       <td className="px-4 py-2">Lock database</td>
                       <td className="px-4 py-2 text-muted-foreground">KeePass</td>
                     </tr>
                   </tbody>
                 </table>
              </div>
            </div>

            {/* Command Menu Shortcuts */}
            <div className="space-y-2">
              <h3 className="font-medium">Command Menu</h3>
              <p className="text-sm text-muted-foreground">
                When the command menu is open:
              </p>
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Key</th>
                      <th className="px-4 py-2 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>↑</Kbd> <Kbd>↓</Kbd></td>
                      <td className="px-4 py-2">Navigate items</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-2"><Kbd>Enter</Kbd></td>
                      <td className="px-4 py-2">Select item</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2"><Kbd>Escape</Kbd></td>
                      <td className="px-4 py-2">Close menu</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <Separator />

          {/* Navigation */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Navigation</h2>
            </div>
            <div className="space-y-3 text-sm">
              <p>
                <strong>Sidebar:</strong> Use the sidebar on the left to navigate between the main sections 
                of the app. The sidebar shows which page you&apos;re currently on.
              </p>
              <p>
                <strong>Command Menu:</strong> Press <Kbd>Space</Kbd> <Kbd>Space</Kbd> to open the command menu. 
                From there you can quickly navigate to any page, search for notes and whiteboards, or create new tasks.
              </p>
              <p>
                <strong>Leader Key Indicator:</strong> When you press <Kbd>Space</Kbd>, a floating indicator 
                appears showing all available shortcuts. This helps you discover and remember the keyboard shortcuts.
              </p>
            </div>
          </section>

          <Separator />

          {/* Features */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Features</h2>
            </div>

            {/* Task Board */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-medium">Task Board</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                A Kanban-style board for managing your tasks. Organize work across five columns:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Inbox:</strong> Capture new tasks quickly</li>
                <li><strong>Todo:</strong> Tasks ready to be worked on</li>
                <li><strong>Doing:</strong> Tasks currently in progress</li>
                <li><strong>Done:</strong> Completed tasks</li>
                <li><strong>Archived:</strong> Tasks you want to keep but hide from active view</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Drag and drop tasks between columns or reorder them within a column. 
                Click on a task to edit its title and add a description.
              </p>
            </div>

            {/* Notes */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                  <StickyNote className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-medium">Notes</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                A minimal note-taking app with Markdown support:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Auto-save:</strong> Notes are automatically saved as you type (after 3 seconds of inactivity)</li>
                <li><strong>Markdown:</strong> Write in plain text with Markdown formatting</li>
                <li><strong>Collections:</strong> Organize notes into collections (folders)</li>
                <li><strong>Search:</strong> Quickly find notes by title or content</li>
                <li><strong>Word count:</strong> Track your writing progress in the footer</li>
              </ul>
            </div>

            {/* Whiteboard */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                  <PenTool className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-medium">Whiteboard</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                A drawing canvas powered by Excalidraw for sketches, diagrams, and visual thinking:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Drawing Tools:</strong> Shapes, arrows, text, freehand drawing, and more</li>
                <li><strong>Auto-save:</strong> Whiteboards automatically save as you draw</li>
                <li><strong>Collections:</strong> Organize whiteboards into collections and folders</li>
                <li><strong>Search:</strong> Quickly find whiteboards by title</li>
                <li><strong>Theme Sync:</strong> Canvas background automatically matches app theme</li>
              </ul>
            </div>

            {/* Bookmarks */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                  <Bookmark className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-medium">Bookmarks</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                A bookmark manager to organize your favorite links by category:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Categories:</strong> Organize bookmarks into custom categories (Work, Code, Personal, etc.)</li>
                <li><strong>Grid Layout:</strong> Full-page view with responsive grid display</li>
                <li><strong>Drag & Drop:</strong> Reorder bookmarks within categories</li>
                <li><strong>Favicons:</strong> Automatically fetches website favicons</li>
                <li><strong>Search:</strong> Filter bookmarks by title, URL, or description</li>
                <li><strong>Import/Export:</strong> Backup and restore bookmarks as JSON</li>
                <li><strong>Quick Access:</strong> Search and open bookmarks from the command menu</li>
              </ul>
            </div>

            {/* API Client */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-medium">API Client</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                A fully-featured API testing tool (similar to Postman):
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>HTTP Methods:</strong> GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS</li>
                <li><strong>Request Builder:</strong> Configure query parameters, headers, and JSON body</li>
                <li><strong>Collections:</strong> Save and organize requests into collections with nested folders</li>
                <li><strong>History:</strong> Automatically saves your last 100 requests</li>
                <li><strong>CORS Proxy:</strong> Built-in proxy to test external APIs without CORS issues</li>
              </ul>
            </div>

            {/* Database Viewer */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                  <Database className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-medium">Database Viewer</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Browse and query your databases directly from the browser:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Multiple Providers:</strong> PostgreSQL, MySQL, and MariaDB support</li>
                <li><strong>Connection Manager:</strong> Save and manage multiple database connections</li>
                <li><strong>SSH Tunneling:</strong> Connect securely through SSH tunnels</li>
                <li><strong>Table Browser:</strong> View all tables with row counts</li>
                <li><strong>Data Viewer:</strong> Browse table data with pagination, sorting, and filtering</li>
                <li><strong>Schema Visualizer:</strong> View table schemas with column types and foreign keys</li>
                <li><strong>Encrypted Storage:</strong> Passwords and SSH keys are encrypted locally</li>
               </ul>
             </div>

            {/* KeePass */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-medium">KeePass Password Manager</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                A secure password manager for managing KeePass databases (.kdbx files) directly in your browser:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>KeePass Support:</strong> Open and manage KeePass v2 databases (.kdbx) with full encryption support</li>
                <li><strong>Key File Support:</strong> Optional key file support for two-factor authentication</li>
                <li><strong>Hierarchy Management:</strong> Browse password entries organized in groups and folders</li>
                <li><strong>Full-Text Search:</strong> Quickly search across all entries in your database</li>
                <li><strong>Entry Details:</strong> View entry information including username, password, URL, tags, and notes</li>
                <li><strong>Copy to Clipboard:</strong> Secure clipboard operations with auto-clearing after 30 seconds</li>
                <li><strong>Multiple Databases:</strong> Manage and unlock multiple KeePass databases simultaneously</li>
                <li><strong>Client-Side Security:</strong> All decryption happens locally in your browser - passwords never leave your device</li>
                <li><strong>Lock/Unlock:</strong> Lock individual databases to free memory while keeping them accessible</li>
              </ul>
            </div>
           </section>

           <Separator />

           {/* Data Storage */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Data Storage</h2>
            </div>
            <div className="space-y-3 text-sm">
              <p>
                All your data is stored locally in your browser using <strong>IndexedDB</strong>. 
                This means:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Your data never leaves your device</li>
                <li>No account or sign-up required</li>
                <li>Works offline after the initial load</li>
                <li>Data persists across browser sessions</li>
              </ul>
              <p className="text-muted-foreground">
                <strong>Note:</strong> Clearing your browser data will delete all stored information. 
                The only external requests made are your actual API calls through the proxy (in the API Client).
              </p>
            </div>
          </section>

          {/* Tips */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Tips</h2>
            </div>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>
                <strong>Quick capture:</strong> Use the command menu (<Kbd>Space</Kbd> <Kbd>Space</Kbd>) 
                to quickly add tasks from anywhere in the app.
              </li>
              <li>
                <strong>Keyboard-first:</strong> Most actions can be performed using keyboard shortcuts. 
                Press <Kbd>Space</Kbd> to see available shortcuts for the current page.
              </li>
              <li>
                <strong>Theme:</strong> Toggle between light and dark mode using the theme button 
                in the sidebar footer.
              </li>
            </ul>
          </section>

          <Separator />

          {/* Backup & Restore */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Backup & Restore</h2>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Export all your data to transfer it to another browser or device, or create a backup. 
                The export file is encrypted with a password you choose.
              </p>
              <div className="rounded-lg border p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">What&apos;s included in the export:</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>API Client: Collections, saved requests, and request history</li>
                    <li>Tasks: All tasks from the kanban board</li>
                    <li>Notes: Note collections, folders, and notes</li>
                    <li>Database Connections: Saved connections and query history</li>
                    <li>Whiteboards: Collections, folders, and drawings</li>
                    <li>Bookmarks: Categories and saved links</li>
                    <li>KeePass: Database files (encrypted)</li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setExportDialogOpen(true)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                  <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Data
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> When importing, existing items will be merged with your current data. 
                  Items with newer timestamps in the backup will overwrite local versions.
                </p>
              </div>
            </div>
          </section>

          <div className="h-8" /> {/* Bottom spacing */}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
      {children}
    </kbd>
  );
}
