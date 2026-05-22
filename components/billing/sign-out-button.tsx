"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton({ label = "Back to login" }: { label?: string }) {
	const router = useRouter();

	const handleSignOut = async () => {
		const supabase = createClient();
		await supabase.auth.signOut();
		router.push("/login");
	};

	return (
		<button
			onClick={handleSignOut}
			className="text-sm text-ink-3 hover:text-ink-2 transition-colors underline underline-offset-2"
		>
			{label}
		</button>
	);
}
