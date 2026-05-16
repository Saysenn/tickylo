import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, errorResponse } from "@/lib/utils/response";
import { GDPR } from "@/configs/gdpr.config";

const BLOCKED_EMAILS = ["laudzioncascalla01@gmail.com"];

const schema = z.object({
	company_name:     z.string().min(2).max(100),
	admin_name:       z.string().min(2).max(100),
	admin_email:      z.string().email(),
	password:         z.string().min(8),
	confirm_password: z.string().min(8),
	reason:           z.string().max(1000).optional(),
	accepted_privacy: z.literal(true),
	accepted_terms:   z.literal(true),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return errorResponse(parsed.error.issues[0].message, 400);
		}

		const { company_name, admin_name, admin_email, password, confirm_password, reason } = parsed.data;

		if (password !== confirm_password) {
			return errorResponse("Passwords do not match.", 400);
		}

		if (BLOCKED_EMAILS.includes(admin_email.toLowerCase())) {
			return errorResponse("This email address cannot be used for company registration.", 403);
		}

		// Check for duplicate application
		const existing = await prisma.organizationApplication.findUnique({
			where: { admin_email },
		});
		if (existing) {
			return errorResponse(
				existing.status === "pending"
					? "An application with this email is already pending review."
					: "An application with this email has already been processed.",
				409,
			);
		}

		// Create Supabase auth user immediately so they have their password set
		// No org_id yet — approval grants access
		const adminClient = createAdminClient();
		const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
			email: admin_email,
			password,
			email_confirm: true,
			user_metadata: { full_name: admin_name },
			app_metadata: { role: "admin" }, // org_id added on approval
		});

		if (authError) {
			if (authError.message.toLowerCase().includes("already registered") ||
				authError.message.toLowerCase().includes("already been registered")) {
				return errorResponse("An account with this email already exists.", 409);
			}
			throw authError;
		}

		// Create Prisma user row (no org_id yet)
		await prisma.user.upsert({
			where: { id: authData.user.id },
			create: {
				id: authData.user.id,
				email: admin_email,
				name: admin_name,
				role: "admin",
				accepted_privacy_at: new Date(),
				accepted_terms_at: new Date(),
				privacy_version: GDPR.privacyPolicyVersion,
				terms_version: GDPR.termsVersion,
			},
			update: {},
		});

		// Record the application
		await prisma.organizationApplication.create({
			data: { company_name, admin_name, admin_email, reason },
		});

		return ok({ message: "Application submitted successfully" });
	} catch (err) {
		console.error("[auth/apply]", err);
		return errorResponse("Internal server error", 500);
	}
}
