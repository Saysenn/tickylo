import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";

/**
 * GET /api/v1/task/stats
 * Lightweight ticket counts by status — single groupBy, no joins.
 */
export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const orgId = user.app_metadata?.org_id as string | undefined;
		const orgFilter = orgId ? { org_id: orgId } : {};

		const counts = await prisma.ticket.groupBy({
			by: ["status"],
			where: orgFilter,
			_count: { id: true },
		});

		const byStatus = Object.fromEntries(counts.map((r) => [r.status, r._count.id]));
		const total = counts.reduce((a, r) => a + r._count.id, 0);

		return ok({
			total,
			pending: byStatus.pending ?? 0,
			assigned: byStatus.assigned ?? 0,
			in_progress: byStatus.in_progress ?? 0,
			on_hold: byStatus.on_hold ?? 0,
			stale: byStatus.stale ?? 0,
			completed: byStatus.completed ?? 0,
			closed: byStatus.closed ?? 0,
			needs_approval: byStatus.needs_approval ?? 0,
		});
	} catch (err) {
		console.error("[task:stats:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
