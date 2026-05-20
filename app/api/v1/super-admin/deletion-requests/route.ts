import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";

export async function GET() {
	try {
		const caller = await requireSuperAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const requests = await prisma.orgDeletionRequest.findMany({
			where:   { status: "pending" },
			include: { org: { select: { name: true, plan: true, seat_count: true, created_at: true } } },
			orderBy: { created_at: "desc" },
		});

		return ok({ requests });
	} catch (err: any) {
		console.error("[super-admin/deletion-requests:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
