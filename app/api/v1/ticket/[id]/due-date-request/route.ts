import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { notifyAdmins } from "@/lib/utils/create-notification";
import { ROLES } from "@/configs/rbac.config";

/** GET /api/v1/ticket/[id]/due-date-request — pending request for this ticket (if any) */
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const request = await prisma.dueDateRequest.findFirst({
			where: { task_id: id, status: "pending" },
			include: { requester: { select: { id: true, name: true, email: true } } },
		});

		return ok(request);
	} catch (err) {
		console.error("[due-date-request:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

const createSchema = z.object({
	requested_date: z.coerce.date(),
	reason: z.string().max(500).optional(),
});

/** POST /api/v1/ticket/[id]/due-date-request — employee submits a due date change request */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		if (isAdmin) return errorResponse("Admins can change the due date directly", 400);

		const { id } = await params;

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Ticket not found", 404);
		if (task.user_id !== user.id) return errorResponse("Only the assignee can request a due date change", 403);
		if (task.assignee_permission !== "editor") return errorResponse("You have viewer access to this ticket", 403);

		// Block if there's already a pending request
		const existing = await prisma.dueDateRequest.findFirst({
			where: { task_id: id, status: "pending" },
		});
		if (existing) return errorResponse("A due date change request is already pending", 409);

		const body = await req.json().catch(() => ({}));
		const validated = createSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const orgId = user.app_metadata?.org_id as string | undefined;
		const actorName = (user.user_metadata?.name as string | undefined) ?? user.email ?? "The assignee";

		const [request] = await prisma.$transaction([
			prisma.dueDateRequest.create({
				data: {
					...(orgId ? { org_id: orgId } : {}),
					task_id: id,
					requested_by: user.id,
					requested_date: validated.data.requested_date,
					reason: validated.data.reason ?? null,
				},
				include: { requester: { select: { id: true, name: true, email: true } } },
			}),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: user.id,
					body: `${actorName} requested a due date change${validated.data.reason ? ` — "${validated.data.reason}"` : ""}.`,
					is_system: true,
				},
			}),
		]);

		notifyAdmins({
			type: "task_updated",
			title: "Due date change requested",
			body: `${actorName} requested a new due date for "${task.title}".`,
			link: `/dashboard/tickets/${id}`,
		}).catch(() => {});

		return ok(request, 201);
	} catch (err) {
		console.error("[due-date-request:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
