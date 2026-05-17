import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireUser } from "@/lib/auth/require-user";
import { ROLES } from "@/configs/rbac.config";
import * as TicketService from "@/services/ticket.service";

const ADMIN_ACTIONS = ["assign", "delete", "status", "priority", "due_date"] as const;

const schema = z.object({
	action: z.enum(["assign", "complete", "delete", "status", "priority", "due_date"]),
	ids: z.array(z.string()).min(1).max(100),
	user_id:  z.string().uuid().optional(),
	status:   z.string().optional(),
	priority: z.string().optional(),
	due_date: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validated = schema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const { action, ids, user_id, status, priority, due_date } = validated.data;

		// Admin-only actions
		if (ADMIN_ACTIONS.includes(action as any)) {
			const admin = await requireAdmin();
			if (!admin) return errorResponse("Forbidden", 403);
			const result = await TicketService.bulkTicketAction(action, ids, admin, { user_id, status, priority, due_date });
			return ok(result);
		}

		// "complete" — allowed for any authenticated user (scoped to their own tickets in service)
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// Elevate to admin-style caller shape for service compatibility
		const caller = { ...user, app_metadata: { ...user.app_metadata, role: user.app_metadata?.role ?? ROLES.EMPLOYEE } };
		const result = await TicketService.bulkTicketAction(action, ids, caller as any, {});
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:bulk:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
