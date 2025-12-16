import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { LeaderKeyProvider } from "@/components/providers/leader-key-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LeaderKeyIndicator } from "@/components/ui/leader-key-indicator";
import { CommandMenuWrapper } from "@/components/ui/command-menu-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MTools - Personal Backoffice",
  description: "Personal backoffice with task board, notes, and API client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            <LeaderKeyProvider>
              <AppSidebar />
              <SidebarInset>
                {children}
              </SidebarInset>
              <LeaderKeyIndicator />
              <CommandMenuWrapper />
            </LeaderKeyProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
