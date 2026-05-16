import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// This layout is for billing-related pages (/billing, /billing/success).
// It requires auth but does NOT gate on plan status — locked orgs must reach /billing.
export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Super admin has no org — shouldn't be here
  const role = user.app_metadata?.role as string | undefined;
  if (role === "super_admin") redirect("/super-admin/dashboard");

  return <>{children}</>;
}
