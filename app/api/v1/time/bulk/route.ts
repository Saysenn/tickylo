import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { ROLES } from "@/configs/rbac.config";

const bulkDeleteSchema = z.object({
	ids: z.array(z.string().cuid()).min(1, "Select at least 1 entry"),
});

// DELETE /api/v1/time/bulk — delete multiple completed time entries
export async function DELETE(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;

		const body = await request.json().catch(() => ({}));
		const validated = bulkDeleteSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const { ids } = validated.data;

		// Verify all entries exist, are completed, and owned by user (or admin)
		const entries = await prisma.timeEntry.findMany({
			where: {
				id: { in: ids },
				end_time: { not: null },
				...(isAdmin ? {} : { user_id: user.id }),
			},
			select: { id: true },
		});

		if (entries.length === 0) return errorResponse("No valid entries found", 404);

		const validIds = entries.map((e) => e.id);
		await prisma.timeEntry.deleteMany({ where: { id: { in: validIds } } });

		return ok({ deleted: validIds.length });
	} catch (err) {
		console.error("[time/bulk:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
