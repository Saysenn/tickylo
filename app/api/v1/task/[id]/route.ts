import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import z from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ROLES } from "@/configs/rbac.config";
import * as TicketService from "@/services/ticket.service";
import { prisma } from "@/lib/infra/prisma";

const linkSchema = z.object({
	url: z.string().url().max(2000),
	label: z.string().max(100).optional(),
});

const adminUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).optional(),
	status: z.enum(["pending", "assigned", "in_progress", "on_hold", "stale", "completed", "closed"]).optional(),
	priority: z.enum(["low", "medium", "high", "critical"]).optional(),
	due_date: z.coerce.date().nullable().optional(),
	ticket_type: z.enum(["internal_task", "request", "incident", "change"]).optional(),
	client_id: z.string().nullable().optional(),
	client_name: z.string().max(200).nullable().optional(),
	client_email: z.string().email().max(200).nullable().optional(),
	estimated_hours: z.number().positive().nullable().optional(),
	billable_hours: z.number().nonnegative().nullable().optional(),
	implementation_plan: z.string().max(5000).nullable().optional(),
	rollback_plan: z.string().max(5000).nullable().optional(),
	links: z.array(linkSchema).max(20).nullable().optional(),
	source: z.enum(["sms", "email", "in_system"]).nullable().optional(),
	assignee_permission: z.enum(["viewer", "editor"]).optional(),
	related_to: z.string().nullable().optional(),
});

// All fields an admin can configure as employee-editable, with their Zod shapes.
// This is the single source of truth — the settings UI and the dynamic schema both derive from this.
const CONFIGURABLE_FIELD_SCHEMAS = {
	title:               z.string().min(1).max(200).optional(),
	description:         z.string().max(1000).nullable().optional(),
	priority:            z.enum(["low", "medium", "high", "critical"]).optional(),
	ticket_type:         z.enum(["internal_task", "request", "incident", "change"]).optional(),
	due_date:            z.coerce.date().nullable().optional(),
	estimated_hours:     z.number().positive().nullable().optional(),
	billable_hours:      z.number().nonnegative().nullable().optional(),
	implementation_plan: z.string().max(5000).nullable().optional(),
	rollback_plan:       z.string().max(5000).nullable().optional(),
	links:               z.array(linkSchema).max(20).nullable().optional(),
	related_to:          z.string().nullable().optional(),
	status:              z.enum(["pending", "assigned", "in_progress", "on_hold", "stale", "completed", "closed"]).optional(),
} as const;

export type ConfigurableField = keyof typeof CONFIGURABLE_FIELD_SCHEMAS;

// Client field schemas — only included when employees_can_edit_client is true
const CLIENT_FIELD_SCHEMAS = {
	client_id:    z.string().nullable().optional(),
	client_name:  z.string().max(200).nullable().optional(),
	client_email: z.string().email().max(200).nullable().optional(),
};

function buildEmployeeSchema(
	allowedFields: string[],
	canEditClient: boolean,
): z.ZodObject<any> {
	const shape: Record<string, z.ZodTypeAny> = {};
	for (const field of allowedFields) {
		if (field in CONFIGURABLE_FIELD_SCHEMAS) {
			shape[field] = CONFIGURABLE_FIELD_SCHEMAS[field as ConfigurableField];
		}
	}
	if (canEditClient) {
		Object.assign(shape, CLIENT_FIELD_SCHEMAS);
	}
	return z.object(shape);
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const ticket = await TicketService.getTicket(id, user);
		return ok(ticket);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:GET:id]", err);
		return errorResponse("Failed to fetch ticket", 500);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		const body = await request.json().catch(() => ({}));

		if (isAdmin) {
			const validated = adminUpdateSchema.safeParse(body);
			if (!validated.success) return errorResponse("Invalid request body", 400);
			const updated = await TicketService.updateTicket(id, user, validated.data);
			return ok(updated);
		}

		// Employee path — build schema dynamically from org settings
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await prisma.organization.findUnique({
			where: { id: orgId },
			select: {
				employee_editable_fields: true,
				creator_can_edit_own_tickets: true,
				employees_can_edit_client: true,
			},
		});
		if (!org) return errorResponse("Organization not found", 404);

		const ticket = await prisma.ticket.findUnique({
			where: { id },
			select: { created_by: true, user_id: true, assignee_permission: true },
		});
		if (!ticket) return errorResponse("Ticket not found", 404);

		const isAssignee = ticket.user_id === user.id;
		const isCreator  = ticket.created_by === user.id;

		const canEditAsAssignee = isAssignee && ticket.assignee_permission === "editor";
		const canEditAsCreator  = isCreator && org.creator_can_edit_own_tickets;

		if (!canEditAsAssignee && !canEditAsCreator) {
			return errorResponse("You do not have permission to edit this ticket.", 403);
		}

		const allowedFields = Array.isArray(org.employee_editable_fields)
			? (org.employee_editable_fields as string[])
			: [];

		const employeeSchema = buildEmployeeSchema(allowedFields, org.employees_can_edit_client);
		const validated = employeeSchema.safeParse(body);

		if (!validated.success) {
			// Identify which submitted fields are no longer in the allowed set
			const submittedFields = Object.keys(body);
			const allAllowed = new Set([
				...allowedFields,
				...(org.employees_can_edit_client ? Object.keys(CLIENT_FIELD_SCHEMAS) : []),
			]);
			const blockedFields = submittedFields.filter((f) => !allAllowed.has(f));

			if (blockedFields.length > 0) {
				const fieldLabels = blockedFields.map((f) => `"${f}"`).join(", ");
				return errorResponse(
					`Your changes could not be saved. Your organization's ticket editing permissions were updated while you were editing. ` +
					`The following field(s) are no longer editable: ${fieldLabels}. ` +
					`Please refresh the page to continue with your current permissions.`,
					403,
				);
			}

			return errorResponse("Invalid request body", 400);
		}

		const updated = await TicketService.updateTicket(id, user, validated.data);
		return ok(updated);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:PATCH:id]", err);
		return errorResponse("Failed to update ticket", 500);
	}
}

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		await TicketService.deleteTicket(id, admin);
		return ok({ success: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:DELETE:id]", err);
		return errorResponse("Failed to delete ticket", 500);
	}
}
