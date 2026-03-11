"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "340px",
        "--sidebar-width-mobile": "300px",
      } as React.CSSProperties}
    >
      {sidebar}
      <SidebarInset>
        {/* Mobile hamburger trigger — fixed top-left, only visible on small screens */}
        <div className="md:hidden fixed top-2 left-2 z-40">
          <SidebarTrigger className="h-10 w-10 bg-card/90 backdrop-blur border border-border shadow-lg rounded-md" />
        </div>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-6 max-w-full min-w-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
