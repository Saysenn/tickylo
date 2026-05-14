import { createClient } from "@/lib/supabase/server";

export async function requireSuperAdmin() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user || user.app_metadata?.role !== "super_admin") return null;
	return user;
}
