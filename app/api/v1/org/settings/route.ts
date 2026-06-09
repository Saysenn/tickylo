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
			select: {
				attachments_enabled: true, departments_enabled: true, extension_enabled: true,
				admins_can_work_on_tickets: true, include_admins_in_summary: true,
				performance_enabled: true, invoices_enabled: true,
				org_join_code: true, name: true, plan: true, is_internal: true,
				logo_url: true, invoice_template: true, invoice_config: true,
				employee_editable_fields: true, creator_can_edit_own_tickets: true,
				employees_can_set_client_on_create: true, employees_can_edit_client: true,
			},
		});
		if (!org) return errorResponse("Organization not found", 404);

		return ok(org);
	} catch (e) {
		console.error("[GET /org/settings]", e);
		return errorResponse("Internal server error", 500);
	}
}

const ALLOWED_EDITABLE_FIELDS = [
	"title", "description", "priority", "ticket_type", "due_date",
	"estimated_hours", "billable_hours", "implementation_plan",
	"rollback_plan", "links", "related_to", "status",
] as const;

const patchSchema = z.object({
	attachments_enabled:                z.boolean().optional(),
	departments_enabled:                z.boolean().optional(),
	extension_enabled:                  z.boolean().optional(),
	admins_can_work_on_tickets:         z.boolean().optional(),
	include_admins_in_summary:          z.boolean().optional(),
	performance_enabled:                z.boolean().optional(),
	invoices_enabled:                   z.boolean().optional(),
	logo_url:                           z.string().url().nullable().optional(),
	invoice_template:                   z.string().max(50).optional(),
	invoice_config:                     z.record(z.string(), z.unknown()).nullable().optional(),
	employee_editable_fields:           z.array(z.enum(ALLOWED_EDITABLE_FIELDS)).optional(),
	creator_can_edit_own_tickets:       z.boolean().optional(),
	employees_can_set_client_on_create: z.boolean().optional(),
	employees_can_edit_client:          z.boolean().optional(),
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

		const d = parsed.data;
		const updateData: Record<string, any> = {};
		if (d.attachments_enabled                !== undefined) updateData.attachments_enabled                = d.attachments_enabled;
		if (d.departments_enabled                !== undefined) updateData.departments_enabled                = d.departments_enabled;
		if (d.extension_enabled                  !== undefined) updateData.extension_enabled                  = d.extension_enabled;
		if (d.admins_can_work_on_tickets         !== undefined) updateData.admins_can_work_on_tickets         = d.admins_can_work_on_tickets;
		if (d.include_admins_in_summary          !== undefined) updateData.include_admins_in_summary          = d.include_admins_in_summary;
		if (d.performance_enabled                !== undefined) updateData.performance_enabled                = d.performance_enabled;
		if (d.invoices_enabled                   !== undefined) updateData.invoices_enabled                   = d.invoices_enabled;
		if (d.logo_url                           !== undefined) updateData.logo_url                           = d.logo_url;
		if (d.invoice_template                   !== undefined) updateData.invoice_template                   = d.invoice_template;
		if (d.invoice_config                     !== undefined) updateData.invoice_config                     = d.invoice_config;
		if (d.employee_editable_fields           !== undefined) updateData.employee_editable_fields           = d.employee_editable_fields;
		if (d.creator_can_edit_own_tickets       !== undefined) updateData.creator_can_edit_own_tickets       = d.creator_can_edit_own_tickets;
		if (d.employees_can_set_client_on_create !== undefined) updateData.employees_can_set_client_on_create = d.employees_can_set_client_on_create;
		if (d.employees_can_edit_client          !== undefined) updateData.employees_can_edit_client          = d.employees_can_edit_client;

		const org = await prisma.organization.update({
			where: { id: orgId },
			data: updateData,
			select: {
				attachments_enabled: true, departments_enabled: true, extension_enabled: true,
				admins_can_work_on_tickets: true, include_admins_in_summary: true,
				performance_enabled: true, invoices_enabled: true,
				logo_url: true, invoice_template: true, invoice_config: true,
				employee_editable_fields: true, creator_can_edit_own_tickets: true,
				employees_can_set_client_on_create: true, employees_can_edit_client: true,
			},
		});

		return ok(org);
	} catch (e) {
		console.error("[PATCH /org/settings]", e);
		return errorResponse("Internal server error", 500);
	}
}
