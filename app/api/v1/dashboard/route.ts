import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as DashboardService from "@/services/dashboard.service";

export async function GET(req: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const dateParam = req.nextUrl.searchParams.get("date") ?? undefined;
		const result = await DashboardService.getDashboard(user, dateParam);
		return ok(result);
	} catch (err) {
		console.error("[dashboard:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
