import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import z from "zod";
import { requireUser } from "@/lib/auth/require-user";
import * as TicketService from "@/services/ticket.service";

const linkSchema = z.object({
	url: z.string().url().max(2000),
	label: z.string().max(100).optional(),
});

const createTaskSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	priority: z.enum(["low", "medium", "high", "critical"]).optional(),
	due_date: z.coerce.date().optional(),
	assigned_to: z.string().optional(),
	ticket_type: z.enum(["internal_task", "request", "incident", "change"]).optional(),
	client_name: z.string().max(200).optional(),
	client_id: z.string().optional(),
	client_email: z.string().email().max(200).optional(),
	estimated_hours: z.number().positive().optional(),
	billable_hours: z.number().nonnegative().optional(),
	implementation_plan: z.string().max(5000).optional(),
	rollback_plan: z.string().max(5000).optional(),
	links: z.array(linkSchema).max(20).optional(),
	source: z.enum(["sms", "email", "in_system"]).optional(),
	assignee_permission: z.enum(["viewer", "editor"]).optional(),
});

export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { searchParams } = new URL(request.url);
		const result = await TicketService.listTickets(user, {
			page: parseInt(searchParams.get("page") ?? "1", 10),
			limit: parseInt(searchParams.get("limit") ?? "10", 10),
			status: searchParams.get("status") ?? undefined,
			search: searchParams.get("search") ?? undefined,
			view: searchParams.get("view") ?? undefined,
			type: searchParams.get("type") ?? undefined,
			priority: searchParams.get("priority") ?? undefined,
			assignee: searchParams.get("assignee") ?? undefined,
			due: searchParams.get("due") ?? undefined,
			date_from: searchParams.get("date_from") ?? undefined,
			date_to: searchParams.get("date_to") ?? undefined,
		});

		return ok(result);
	} catch (err) {
		console.error("[task:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json();
		const validated = createTaskSchema.safeParse(body);
		if (!validated.success)
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const entry = await TicketService.createTicket(user, validated.data);
		return ok(entry, 201);
	} catch (err: any) {
		console.error("[task:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
