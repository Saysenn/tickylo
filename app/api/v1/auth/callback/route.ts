import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES, DEFAULT_ROLE } from "@/configs/rbac.config";
import { prisma } from "@/lib/prisma";

/** Safe-redirect: only allow relative paths that start with `/` and have no protocol. */
function safeRedirect(next: string | null): string {
	if (!next) return "/dashboard";
	if (
		!next.startsWith("/") ||
		next.startsWith("//") ||
		/^\/[a-z]+:/i.test(next)
	) {
		return "/dashboard";
	}
	return next;
}

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	const redirectTo = safeRedirect(searchParams.get("next"));

	if (code) {
		const supabase = await createClient();
		const { data: sessionData, error } =
			await supabase.auth.exchangeCodeForSession(code);

		if (error || !sessionData.user) {
			return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
		}

		// Provision role for new OAuth users — only needs SUPABASE_SERVICE_ROLE_KEY, no DB
		const { user } = sessionData;
		if (!user.app_metadata?.role) {
			try {
				const admin = createAdminClient();

				// Count existing users to determine first-admin
				const { data: usersData } = await admin.auth.admin.listUsers({
					perPage: 2,
				});
				const role =
					(usersData?.users?.length ?? 2) <= 1 ? ROLES.ADMIN : DEFAULT_ROLE;

				await admin.auth.admin.updateUserById(user.id, {
					app_metadata: { role },
				});

				/** create public user. ( replication of auth user ) */
				/** create public user full ATOMICITY */
				console.log("user: ", user);
				try {
					await prisma.user.upsert({
						where: { id: user.id },
						create: {
							id: user.id,
							email: user.email!,
							name: user.user_metadata?.full_name ?? "Unknown",
							role: user.app_metadata?.role ?? DEFAULT_ROLE,
						},
						update: {
							email: user.email!,
							name: user.user_metadata?.full_name ?? "Unknown",
							role: user.app_metadata?.role ?? DEFAULT_ROLE,
						},
					});
				} catch (error) {
					await admin.auth.admin.deleteUser(user.id);
					console.error("[register] Failed to create public user:", error);
					return NextResponse.json(
						{ error: "Failed to create user. Please try again." },
						{ status: 500 },
					);
				}
			} catch (err) {
				console.error("[callback] Role provisioning failed:", err);
			}
		}

		return NextResponse.redirect(`${origin}${redirectTo}`);
	}

	return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
