import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { sendEmail } from "@/lib/email/send";
import { auditLog } from "@/lib/utils/audit";
import { z } from "zod";

async function requireSuperAdmin() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user || user.app_metadata?.role !== "super_admin") return null;
	return user;
}

const schema = z.object({ reason: z.string().min(1, "Reason is required") });

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const caller = await requireSuperAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const { id } = await params;

		const body = await request.json();
		const parsed = schema.safeParse(body);
		if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

		const { reason } = parsed.data;

		const application = await prisma.organizationApplication.findUnique({ where: { id } });
		if (!application) return errorResponse("Not found", 404);
		if (application.status !== "pending") return errorResponse("Application already reviewed", 400);

		await prisma.organizationApplication.update({
			where: { id },
			data: { status: "rejected", reject_reason: reason, reviewed_at: new Date() },
		});

		// Send rejection email
		await sendEmail({
			to: application.admin_email,
			subject: `Update on your Tickworks company registration`,
			html: `
				<p>Hi ${application.admin_name},</p>
				<p>Thank you for your interest in Tickworks. Unfortunately, your company registration for <strong>${application.company_name}</strong> was not approved at this time.</p>
				<p><strong>Reason:</strong> ${reason}</p>
				<p>If you believe this was a mistake or would like to reapply, please contact our support team.</p>
				<p>— The Tickworks Team</p>
			`,
		});

		auditLog({
			actor_id: caller.id,
			actor_role: "super_admin",
			action: "REJECT",
			entity_type: "org_application",
			entity_id: id,
			after: { company_name: application.company_name, reason },
		});

		return ok({ message: "Application rejected" });
	} catch (err) {
		console.error("[super-admin/applications/reject]", err);
		return errorResponse("Internal server error", 500);
	}
}
