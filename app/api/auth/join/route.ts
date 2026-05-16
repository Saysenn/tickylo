import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, errorResponse } from "@/lib/utils/response";
import { sendEmail } from "@/lib/email/send";
import { employeeJoinRequestEmail } from "@/lib/email/templates";
import { GDPR } from "@/configs/gdpr.config";
import { rateLimit, getIP } from "@/lib/utils/rate-limit";

const schema = z.object({
	org_join_code:    z.string().min(1),
	name:             z.string().min(2).max(100),
	email:            z.string().email(),
	password:         z.string().min(8),
	accepted_privacy: z.literal(true),
	accepted_terms:   z.literal(true),
});

export async function POST(request: NextRequest) {
	try {
		// 10 join attempts per IP per 15 minutes
		const rl = await rateLimit(`join:${getIP(request)}`, 10, 900);
		if (rl) return rl;
		const body = await request.json();
		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return errorResponse(parsed.error.issues[0].message, 400);
		}

		const { org_join_code, name, email, password } = parsed.data;

		// Validate org_join_code
		const org = await prisma.organization.findUnique({
			where: { org_join_code },
			select: { id: true, name: true },
		});
		if (!org) return errorResponse("Invalid join code", 404);

		const supabase = createAdminClient();

		// Create Supabase auth user
		const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { full_name: name },
			app_metadata:  { role: "employee", org_id: org.id },
		});
		if (authErr) {
			if (authErr.message.includes("already been registered")) {
				return errorResponse("An account with this email already exists.", 409);
			}
			return errorResponse(authErr.message, 400);
		}

		const userId = authData.user.id;

		// Create Prisma user row
		await prisma.user.upsert({
			where: { id: userId },
			update: { org_id: org.id, role: "employee", name },
			create: {
				id: userId,
				email,
				name,
				org_id: org.id,
				role: "employee",
				accepted_privacy_at: new Date(),
				accepted_terms_at: new Date(),
				privacy_version: GDPR.privacyPolicyVersion,
				terms_version: GDPR.termsVersion,
			},
		});

		// Create join request for admin to approve
		await prisma.userJoinRequest.create({
			data: { org_id: org.id, user_id: userId },
		});

		// Notify org admins by email (fire-and-forget)
		const admins = await prisma.user.findMany({
			where: { org_id: org.id, role: "admin" },
			select: { email: true },
		});
		const { subject, html } = employeeJoinRequestEmail({
			employeeName: name,
			employeeEmail: email,
			orgName: org.name,
		});
		admins.forEach(({ email: adminEmail }) => {
			sendEmail({ to: adminEmail, subject, html }).catch(() => {});
		});

		return ok({ message: "Join request submitted. Your admin will approve your access." });
	} catch (err) {
		console.error("[auth/join]", err);
		return errorResponse("Internal server error", 500);
	}
}
