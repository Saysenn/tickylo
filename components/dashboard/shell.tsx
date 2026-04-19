"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { UserProfile } from "@/types";

interface DashboardShellProps {
  user: UserProfile;
  orgName?: string | null;
  children: React.ReactNode;
}

export function DashboardShell({ user, orgName, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} role={user.role} />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          user={user}
          orgName={orgName}
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 p-5 md:p-7">{children}</main>
      </div>
    </div>
  );
}
