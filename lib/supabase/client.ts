import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Next.js client-side code.
 * usually for public of un protected routes like login and register pages
 */
export const createClient = () =>
	createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
	);
