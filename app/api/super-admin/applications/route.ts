import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";

async function requireSuperAdmin() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user || user.app_metadata?.role !== "super_admin") return null;
	return user;
}

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
		console.error("[super-admin/applications]", err);
		return errorResponse("Internal server error", 500);
	}
}
