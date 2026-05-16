import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/shell";
import AppProvider from "@/providers/app-provider";
import UserProvider from "@/providers/user-provider";
import { OrgSettingsProvider } from "@/providers/org-settings-provider";
import { prisma } from "@/lib/infra/prisma";
import type { UserProfile } from "@/types";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;
  const orgId = user.app_metadata?.org_id as string | undefined;

  // Super admin has no org — allow through. Everyone else needs an approved org.
  if (role !== "super_admin" && !orgId) redirect("/pending");

  // Super admin belongs in /super-admin, not the regular dashboard
  if (role === "super_admin") redirect("/super-admin/dashboard");

  const org = orgId
    ? await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } })
    : null;

  const userProfile: UserProfile = {
    id: user.id,
    email: user.email ?? "",
    name: user.user_metadata?.full_name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    twoFactorEnabled: false,
    role: (user.app_metadata?.role ?? "employee") as UserProfile["role"],
    org_id: user.app_metadata?.org_id ?? null,
  };

  return (
    <AppProvider>
      <UserProvider user={userProfile}>
        <OrgSettingsProvider>
          <DashboardShell user={userProfile} orgName={org?.name ?? null}>
            {children}
          </DashboardShell>
        </OrgSettingsProvider>
      </UserProvider>
    </AppProvider>
  );
}
