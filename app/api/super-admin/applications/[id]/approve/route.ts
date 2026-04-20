import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { sendEmail } from "@/lib/email/send";

async function requireSuperAdmin() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user || user.app_metadata?.role !== "super_admin") return null;
	return user;
}

export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const caller = await requireSuperAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const { id } = await params;

		const application = await prisma.organizationApplication.findUnique({ where: { id } });
		if (!application) return errorResponse("Not found", 404);
		if (application.status !== "pending") return errorResponse("Application already reviewed", 400);

		// Create the organization
		const slug = application.company_name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.substring(0, 50);

		const org = await prisma.organization.create({
			data: {
				name: application.company_name,
				slug: `${slug}-${Date.now()}`,
			},
		});

		// Find the admin's Supabase auth user (created during /apply)
		const adminClient = createAdminClient();
		const { data: { users } } = await adminClient.auth.admin.listUsers();
		const adminUser = users.find((u) => u.email === application.admin_email);

		if (!adminUser) {
			return errorResponse("Admin auth account not found. The applicant may need to re-apply.", 404);
		}

		// Grant org_id + admin role
		const { error: updateErr } = await adminClient.auth.admin.updateUserById(adminUser.id, {
			app_metadata: {
				...adminUser.app_metadata,
				role: "admin",
				org_id: org.id,
			},
		});
		if (updateErr) throw new Error(`Failed to update user metadata: ${updateErr.message}`);

		// Update Prisma user row
		await prisma.user.upsert({
			where: { id: adminUser.id },
			update: { org_id: org.id, role: "admin" },
			create: {
				id: adminUser.id,
				email: application.admin_email,
				name: application.admin_name,
				org_id: org.id,
				role: "admin",
			},
		});

		// Mark application as approved
		await prisma.organizationApplication.update({
			where: { id },
			data: { status: "approved", reviewed_at: new Date() },
		});

		// Send approval email
		const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://performai.app";
		await sendEmail({
			to: application.admin_email,
			subject: `Your company registration for ${application.company_name} has been approved`,
			html: `
				<p>Hi ${application.admin_name},</p>
				<p>Great news! Your company registration for <strong>${application.company_name}</strong> on Tickworks has been approved.</p>
				<p>Log in using the email and password you set during registration:</p>
				<p><a href="${appUrl}/login" style="display:inline-block;padding:10px 20px;background:#80ed99;color:#000;text-decoration:none;border-radius:6px;font-weight:600;">Log In to Tickworks →</a></p>
				<p>— The Tickworks Team</p>
			`,
		});

		return ok({ org_id: org.id, message: "Application approved" });
	} catch (err) {
		console.error("[super-admin/applications/approve]", err);
		return errorResponse("Internal server error", 500);
	}
}
