"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 hidden md:flex flex-col glass border-r min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b">
        <div className="w-8 h-8 bg-mint rounded-xl flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(128,237,153,0.35)]">
          <Zap className="w-4 h-4 text-ink" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-ink text-sm tracking-tight">AppTemplate</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-mint/15 text-ink border-l-2 border-mint pl-[10px]"
                  : "text-ink-3 hover:bg-mint/8 hover:text-ink-2 border-l-2 border-transparent pl-[10px]"
              )}
            >
              <Icon
                className={cn("w-4 h-4 shrink-0", isActive ? "text-ink-2" : "text-ink-3")}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t">
        <p className="text-[11px] text-ink-3 font-medium tracking-wide">v1.0.0</p>
      </div>
    </aside>
  );
}
