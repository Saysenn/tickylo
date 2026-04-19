import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SuperAdminHeader from "@/components/super-admin/header";
import AppProvider from "@/providers/app-provider";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user || user.app_metadata?.role !== "super_admin") {
		redirect("/login");
	}

	return (
		<AppProvider>
			<div className="min-h-screen bg-background">
				<SuperAdminHeader email={user.email ?? ""} />
				<main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
			</div>
		</AppProvider>
	);
}
