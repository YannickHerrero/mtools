"use client";

import { Keyboard, Navigation, Database, Layers, StickyNote, Send, HelpCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function HelpPage() {
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
                      <td className="px-4 py-2"><Kbd>Space</Kbd> <Kbd>a</Kbd></td>
                      <td className="px-4 py-2">Go to API Client</td>
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
                    <tr>
                      <td className="px-4 py-2"><Kbd>Cmd/Ctrl</Kbd> + <Kbd>S</Kbd></td>
                      <td className="px-4 py-2">Save note</td>
                      <td className="px-4 py-2 text-muted-foreground">Notes</td>
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
                From there you can quickly navigate to any page, search for notes, or create new tasks.
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

          <div className="h-8" /> {/* Bottom spacing */}
        </div>
      </ScrollArea>
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
