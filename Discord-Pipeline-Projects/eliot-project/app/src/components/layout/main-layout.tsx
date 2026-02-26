"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "340px",
        "--sidebar-width-mobile": "340px",
      } as React.CSSProperties}
    >
      {sidebar}
      <SidebarInset>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 max-w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
