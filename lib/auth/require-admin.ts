import { createClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/configs/rbac.config";

export async function requireAdmin() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;
	if ((user.app_metadata?.role as Role) !== ROLES.ADMIN) return null;
	return user;
}
