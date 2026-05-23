import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import z from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ROLES } from "@/configs/rbac.config";
import * as TicketService from "@/services/ticket.service";

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
});

const employeeUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).nullable().optional(),
	priority: z.enum(["low", "medium", "high", "critical"]).optional(),
	ticket_type: z.enum(["internal_task", "request", "incident", "change"]).optional(),
	due_date: z.coerce.date().nullable().optional(),
	implementation_plan: z.string().max(5000).nullable().optional(),
	rollback_plan: z.string().max(5000).nullable().optional(),
	links: z.array(linkSchema).max(20).nullable().optional(),
	billable_hours: z.number().nonnegative().nullable().optional(),
});

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
		const schema = isAdmin ? adminUpdateSchema : employeeUpdateSchema;
		const body = await request.json().catch(() => ({}));
		const validated = schema.safeParse(body);
		if (!validated.success) return errorResponse("Invalid request body", 400);

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
