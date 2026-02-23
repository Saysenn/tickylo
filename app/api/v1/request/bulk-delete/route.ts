import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";
import z from "zod";

const bulkDeleteSchema = z.object({
	ids: z.array(z.string()).min(1),
});

/**
 * POST /api/v1/request/bulk-delete — admin bulk deletes requests
 */
export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const body = await request.json();
		const validated = bulkDeleteSchema.safeParse(body);
		if (!validated.success) return errorResponse("Invalid input", 400);

		const { ids } = validated.data;

		const { count } = await prisma.leave.deleteMany({
			where: { id: { in: ids } },
		});

		return ok({ deleted: count });
	} catch (err) {
		console.error("[request:bulk-delete]", err);
		return errorResponse("Internal server error", 500);
	}
}
