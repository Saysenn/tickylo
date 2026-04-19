import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES, DEFAULT_ROLE } from "@/configs/rbac.config";

import { prisma } from "@/lib/infra/prisma";

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

		const { user } = sessionData;
		const role = user.app_metadata?.role as string | undefined;
		const orgId = user.app_metadata?.org_id as string | undefined;

		// Super admin: send to super-admin dashboard
		if (role === ROLES.SUPER_ADMIN) {
			return NextResponse.redirect(`${origin}/super-admin/dashboard`);
		}

		// User has no org — check if they have a pending/approved application
		if (!orgId) {
			const application = user.email
				? await prisma.organizationApplication.findUnique({
						where: { admin_email: user.email },
					})
				: null;

			if (application?.status === "pending") {
				return NextResponse.redirect(`${origin}/pending`);
			}

			// Approved but org_id wasn't applied to this auth user (e.g. re-created account)
			// Re-link them to their org automatically
			if (application?.status === "approved") {
				const org = await prisma.organization.findFirst({
					where: { slug: { contains: application.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 20) } },
				});
				if (org) {
					const adminClient = createAdminClient();
					await adminClient.auth.admin.updateUserById(user.id, {
						app_metadata: { role: "admin", org_id: org.id },
					});
					await prisma.user.upsert({
						where: { id: user.id },
						create: { id: user.id, email: user.email!, name: user.user_metadata?.full_name ?? application.admin_name, role: "admin", org_id: org.id },
						update: { org_id: org.id, role: "admin" },
					});
					return NextResponse.redirect(`${origin}/dashboard`);
				}
				// Org not found — something went wrong during approval
				return NextResponse.redirect(`${origin}/pending`);
			}

			// No application at all — unknown user
			// Delete the auto-created OAuth account so Supabase auth stays clean
			const adminClient = createAdminClient();
			await adminClient.auth.admin.deleteUser(user.id);
			return NextResponse.redirect(`${origin}/register`);
		}

		// Upsert the public User row
		try {
			await prisma.user.upsert({
				where: { id: user.id },
				create: {
					id: user.id,
					email: user.email!,
					name: user.user_metadata?.full_name ?? user.email ?? "Unknown",
					role: role ?? DEFAULT_ROLE,
					org_id: orgId,
				},
				update: {
					email: user.email!,
					name: user.user_metadata?.full_name ?? user.email ?? "Unknown",
					role: role ?? DEFAULT_ROLE,
					org_id: orgId,
				},
			});
		} catch (err) {
			console.error("[callback] User provisioning failed:", err);
		}

		return NextResponse.redirect(`${origin}${redirectTo}`);
	}

	return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
