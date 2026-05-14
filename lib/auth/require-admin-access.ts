import { createClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/configs/rbac.config";

/** Allows admin and super_admin. Super_admin has no org_id → sees all orgs in service layer. */
export async function requireAdminAccess() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return null;
	const role = user.app_metadata?.role as Role;
	if (role !== ROLES.ADMIN && role !== ROLES.SUPER_ADMIN) return null;
	return user;
}
