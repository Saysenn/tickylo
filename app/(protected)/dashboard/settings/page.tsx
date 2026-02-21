import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { formatInitials } from "@/utils/format";
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
import { TwoFactorSettings } from "@/components/dashboard/settings/two-factor-settings";

export const metadata = {
	title: "Settings",
	description: "Manage your account and security settings",
};

export default async function SettingsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const name = user.user_metadata?.full_name ?? null;
	const initials = formatInitials(name, user.email ?? "");

	return (
		<div className="max-w-5xl space-y-6">
			{/* Page header */}
			<div>
				<h1 className="text-2xl font-bold text-ink">Settings</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Manage your account and security preferences.
				</p>
			</div>

			{/* 2-column grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
				{/* Left — Profile */}
				<Card className="h-full">
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-xl bg-mint/15 flex items-center justify-center shrink-0">
								<User className="w-4 h-4 text-ink-2" />
							</div>
							<div>
								<CardTitle className="text-base">Profile</CardTitle>
								<CardDescription>Your account information.</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center gap-4">
							<Avatar size="lg" className="shrink-0">
								<AvatarFallback className="bg-mint text-ink font-bold text-lg">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<p className="font-semibold text-ink">
										{name ?? "No name set"}
									</p>
									<Badge className="bg-mint/20 text-ink-2 hover:bg-mint/20 border-0 text-xs">
										Active
									</Badge>
								</div>
								<p className="text-sm text-ink-3 truncate mt-0.5">
									{user.email}
								</p>
							</div>
						</div>

						<Separator />

						<div className="space-y-2 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">User ID</span>
								<span className="font-mono text-xs text-ink-3 truncate max-w-[160px]">
									{user.id}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Provider</span>
								<span className="text-ink-2 capitalize">
									{user.app_metadata?.provider ?? "email"}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Right — 2FA */}
				<TwoFactorSettings />
			</div>
		</div>
	);
}
