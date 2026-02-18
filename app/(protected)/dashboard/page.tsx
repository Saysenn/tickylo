import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldCheck, User, Settings, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/login");

	const name = user.user_metadata?.full_name ?? null;
	const initials = name
		? name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.slice(0, 2)
				.toUpperCase()
		: (user.email?.[0]?.toUpperCase() ?? "U");

	const { data: aal } =
		await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
	const mfaEnabled = aal?.currentLevel === "aal2";

	return <div className="max-w-3xl space-y-6"></div>;
}
