"use client";

import dynamic from "next/dynamic";
import { UserDropdown } from "./user-dropdown";
import { NotificationBell } from "./notification-bell";
import type { UserProfile } from "@/types";

const TimeTrackerButton = dynamic(
  () => import("./time-tracker/time-tracker-button").then((m) => ({ default: m.TimeTrackerButton })),
  { ssr: false }
);

interface HeaderProps {
  user: UserProfile;
  orgName?: string | null;
  title?: string;
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
}

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="flex flex-col justify-center gap-[5px] w-5 h-5">
      <span
        className={`block h-[2px] rounded-full bg-ink-2 transition-all duration-300 origin-center ${
          isOpen ? "rotate-45 translate-y-[7px] w-5" : "w-5"
        }`}
      />
      <span
        className={`block h-[2px] rounded-full bg-ink-2 transition-all duration-300 ${
          isOpen ? "opacity-0 w-5" : "w-3.5"
        }`}
      />
      <span
        className={`block h-[2px] rounded-full bg-ink-2 transition-all duration-300 origin-center ${
          isOpen ? "-rotate-45 -translate-y-[7px] w-5" : "w-2"
        }`}
      />
    </div>
  );
}

export function Header({ user, orgName, title, onMenuClick, sidebarOpen = false }: HeaderProps) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 glass-header sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-mint/10 transition-colors"
          aria-label="Toggle sidebar"
        >
          <HamburgerIcon isOpen={sidebarOpen} />
        </button>

{title && (
          <h1 className="text-sm font-semibold text-ink">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <TimeTrackerButton />
        <NotificationBell />
        <UserDropdown user={user} />
      </div>
    </header>
  );
}
