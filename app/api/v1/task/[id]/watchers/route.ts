import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";

/**
 * GET /api/v1/task/[id]/watchers
 * Returns watcher list + whether current user is watching.
 */
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const watchers = await prisma.taskWatcher.findMany({
			where: { task_id: id },
			include: { user: { select: { id: true, name: true, email: true } } },
		});

		const isWatching = watchers.some((w) => w.user_id === user.id);

		return ok({ watchers, isWatching, count: watchers.length });
	} catch (err) {
		console.error("[watchers:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * POST /api/v1/task/[id]/watchers
 * Current user starts watching the task.
 */
export async function POST(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		const watcher = await prisma.taskWatcher.upsert({
			where: { task_id_user_id: { task_id: id, user_id: user.id } },
			create: { task_id: id, user_id: user.id },
			update: {},
		});

		return ok(watcher);
	} catch (err) {
		console.error("[watchers:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * DELETE /api/v1/task/[id]/watchers
 * Current user stops watching the task.
 */
export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		await prisma.taskWatcher.deleteMany({
			where: { task_id: id, user_id: user.id },
		});

		return ok({ success: true });
	} catch (err) {
		console.error("[watchers:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
