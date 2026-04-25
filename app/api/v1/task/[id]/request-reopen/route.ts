import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { NextRequest } from "next/server";
import { notifyAdmins } from "@/lib/utils/create-notification";
import { ROLES } from "@/configs/rbac.config";

/**
 * POST /api/v1/task/[id]/request-reopen
 * Assignee only. Creates a comment notifying admins that the employee wants
 * the ticket reopened from stale or on_hold state.
 */
export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Ticket not found", 404);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		if (isAdmin) return errorResponse("Admins can reopen tickets directly", 400);
		if (task.user_id !== user.id) return errorResponse("Only the assignee can request a reopen", 403);
		if (!["stale", "on_hold"].includes(task.status)) {
			return errorResponse("Only stale or on-hold tickets can be requested for reopen", 400);
		}

		const actorName = (user.user_metadata?.name as string | undefined) ?? user.email ?? "The assignee";

		await prisma.taskComment.create({
			data: {
				task_id: id,
				user_id: user.id,
				body: `${actorName} requested to reopen this ticket — currently ${task.status === "on_hold" ? "on hold" : "stale"}.`,
				is_system: true,
			},
		});

		notifyAdmins({
			type: "task_updated",
			title: "Reopen requested",
			body: `${actorName} requested to reopen "${task.title}".`,
			link: `/dashboard/tickets/${id}`,
		}).catch(() => {});

		return ok({ success: true });
	} catch (error) {
		console.error("[task:request-reopen:POST]", error);
		return errorResponse("Failed to submit reopen request", 500);
	}
}
