import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";

/**
 * GET /api/v1/employees/workload
 * Admin only. Returns active (non-completed) task count per user_id.
 * Used to show workload in the reassign dialog.
 */
export async function GET() {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const counts = await prisma.task.groupBy({
			by: ["user_id"],
			where: {
				user_id: { not: null },
				status: { not: "completed" },
			},
			_count: { id: true },
		});

		// Shape into { [user_id]: count }
		const workload: Record<string, number> = {};
		for (const row of counts) {
			if (row.user_id) workload[row.user_id] = row._count.id;
		}

		return ok(workload);
	} catch (err) {
		console.error("[employees:workload:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
