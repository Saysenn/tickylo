import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await prisma.organization.findUnique({
			where: { id: orgId },
			select: { attachments_enabled: true, departments_enabled: true, extension_enabled: true, admins_can_work_on_tickets: true, include_admins_in_summary: true, org_join_code: true, name: true, plan: true, is_internal: true, logo_url: true, invoice_template: true, invoice_config: true },
		});
		if (!org) return errorResponse("Organization not found", 404);

		return ok({
			attachments_enabled: org.attachments_enabled,
			departments_enabled: org.departments_enabled,
			extension_enabled: org.extension_enabled,
			admins_can_work_on_tickets: org.admins_can_work_on_tickets,
			include_admins_in_summary: org.include_admins_in_summary,
			org_join_code: org.org_join_code,
			name: org.name,
			plan: org.plan,
			is_internal: org.is_internal,
			logo_url: org.logo_url,
			invoice_template: org.invoice_template,
			invoice_config: org.invoice_config,
		});
	} catch (e) {
		console.error("[GET /org/settings]", e);
		return errorResponse("Internal server error", 500);
	}
}

const patchSchema = z.object({
	attachments_enabled: z.boolean().optional(),
	departments_enabled: z.boolean().optional(),
	extension_enabled: z.boolean().optional(),
	admins_can_work_on_tickets: z.boolean().optional(),
	include_admins_in_summary: z.boolean().optional(),
	logo_url: z.string().url().nullable().optional(),
	invoice_template: z.string().max(50).optional(),
	invoice_config: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
	try {
		const user = await requireAdmin();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const body = await req.json();
		const parsed = patchSchema.safeParse(body);
		if (!parsed.success) return errorResponse(parsed.error.message, 400);

		const updateData: Record<string, any> = {};
		if (parsed.data.attachments_enabled !== undefined) updateData.attachments_enabled = parsed.data.attachments_enabled;
		if (parsed.data.departments_enabled !== undefined) updateData.departments_enabled = parsed.data.departments_enabled;
		if (parsed.data.extension_enabled !== undefined) updateData.extension_enabled = parsed.data.extension_enabled;
		if (parsed.data.admins_can_work_on_tickets !== undefined) updateData.admins_can_work_on_tickets = parsed.data.admins_can_work_on_tickets;
		if (parsed.data.include_admins_in_summary !== undefined) updateData.include_admins_in_summary = parsed.data.include_admins_in_summary;
		if (parsed.data.logo_url !== undefined) updateData.logo_url = parsed.data.logo_url;
		if (parsed.data.invoice_template !== undefined) updateData.invoice_template = parsed.data.invoice_template;
		if (parsed.data.invoice_config !== undefined) updateData.invoice_config = parsed.data.invoice_config;

		const org = await prisma.organization.update({
			where: { id: orgId },
			data: updateData,
			select: { attachments_enabled: true, departments_enabled: true, extension_enabled: true, admins_can_work_on_tickets: true, include_admins_in_summary: true, logo_url: true, invoice_template: true, invoice_config: true },
		});

		return ok({
			attachments_enabled: org.attachments_enabled,
			departments_enabled: org.departments_enabled,
			extension_enabled: org.extension_enabled,
			admins_can_work_on_tickets: org.admins_can_work_on_tickets,
			include_admins_in_summary: org.include_admins_in_summary,
			logo_url: org.logo_url,
			invoice_template: org.invoice_template,
			invoice_config: org.invoice_config,
		});
	} catch (e) {
		console.error("[PATCH /org/settings]", e);
		return errorResponse("Internal server error", 500);
	}
}
