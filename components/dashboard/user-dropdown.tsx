"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/types";

interface UserDropdownProps {
  user: UserProfile;
}

export function UserDropdown({ user }: UserDropdownProps) {
  const router = useRouter();

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2.5 px-2 h-9 rounded-xl hover:bg-mint/10 focus-visible:ring-mint/30"
        >
          <Avatar className="size-7">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name ?? user.email} />}
            <AvatarFallback className="bg-mint text-ink text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-ink-2 hidden sm:block max-w-[120px] truncate">
            {user.name ?? user.email}
          </span>
          <ChevronDown className="size-3.5 text-ink-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52 mt-1 rounded-xl">
        <DropdownMenuLabel className="pb-2">
          <p className="text-sm font-semibold text-ink truncate">
            {user.name ?? "No name set"}
          </p>
          <p className="text-xs text-muted-foreground font-normal truncate">{user.email}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
          <Link href="/settings">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          className="cursor-pointer rounded-lg"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
