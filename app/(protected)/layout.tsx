import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/shell";
import AppProvider from "@/providers/app-provider";
import UserProvider from "@/providers/user-provider";
import type { UserProfile } from "@/types";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userProfile: UserProfile = {
    id: user.id,
    email: user.email ?? "",
    name: user.user_metadata?.full_name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    twoFactorEnabled: false,
    role: (user.app_metadata?.role ?? "employee") as UserProfile["role"],
  };

  return (
    <AppProvider>
      <UserProvider user={userProfile}>
        <DashboardShell user={userProfile}>
          {children}
        </DashboardShell>
      </UserProvider>
    </AppProvider>
  );
}
