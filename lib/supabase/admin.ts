import { createClient } from "@supabase/supabase-js";

/** Server-only admin client — uses the service role key, never expose to the browser. */
/** usually used in server api side logics to access the admin side of the database ( authentication datas )*/
export const createAdminClient = () =>
	createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
		{ auth: { autoRefreshToken: false, persistSession: false } },
	);
