import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SuperAdminSidebar } from "@/components/super-admin/sidebar";
import { SuperAdminTopbar } from "@/components/super-admin/topbar";
import AppProvider from "@/providers/app-provider";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user || user.app_metadata?.role !== "super_admin") {
		redirect("/login");
	}

	return (
		<AppProvider>
			<div className="flex min-h-screen bg-background">
				<SuperAdminSidebar />
				<div className="flex flex-col flex-1 min-w-0">
					<SuperAdminTopbar email={user.email ?? ""} />
					<main className="flex-1 p-7">{children}</main>
				</div>
			</div>
		</AppProvider>
	);
}
