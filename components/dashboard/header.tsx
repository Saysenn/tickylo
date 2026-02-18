import { UserDropdown } from "./user-dropdown";
import type { UserProfile } from "@/types";

interface HeaderProps {
  user: UserProfile;
  title?: string;
}

export function Header({ user, title }: HeaderProps) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 glass border-b border-(--border) sticky top-0 z-30">
      {title ? (
        <h1 className="text-sm font-semibold text-ink">{title}</h1>
      ) : (
        <div />
      )}
      <UserDropdown user={user} />
    </header>
  );
}
