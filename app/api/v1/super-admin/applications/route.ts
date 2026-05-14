import { NextRequest } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";

export async function GET(request: NextRequest) {
	try {
		const caller = await requireSuperAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status") ?? "pending";

		const applications = await prisma.organizationApplication.findMany({
			where: { status },
			orderBy: { created_at: "desc" },
		});

		return ok(applications);
	} catch (err) {
		console.error("[super-admin/applications:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
