import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
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
  };

  return (
    <AppProvider>
      <UserProvider user={userProfile}>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <Header user={userProfile} />
            <main className="flex-1 p-5 md:p-7">
              {children}
            </main>
          </div>
        </div>
      </UserProvider>
    </AppProvider>
  );
}
