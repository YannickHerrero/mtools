"use client";

import { Bookmark, KanbanSquare, StickyNote, Send, HelpCircle, Database, PenTool, KeyRound, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  {
    title: "Tasks",
    href: "/tasks",
    icon: KanbanSquare,
  },
  {
    title: "Notes",
    href: "/notes",
    icon: StickyNote,
  },
  {
    title: "Whiteboard",
    href: "/whiteboard",
    icon: PenTool,
  },
  {
    title: "Bookmarks",
    href: "/bookmarks",
    icon: Bookmark,
  },
  {
    title: "KeePass",
    href: "/keepass",
    icon: KeyRound,
  },
  {
    title: "API Client",
    href: "/api-client",
    icon: Send,
  },
  {
    title: "Database",
    href: "/database",
    icon: Database,
  },
  {
    title: "Excel",
    href: "/excel",
    icon: FileSpreadsheet,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            M
          </div>
          <span className="font-semibold">MTools</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href || pathname.startsWith(item.href + "/")}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between px-2 py-2">
          <Link 
            href="/help" 
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Help</span>
          </Link>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
