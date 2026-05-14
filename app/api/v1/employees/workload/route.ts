import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as EmployeeService from "@/services/employees.service";

export async function GET() {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const result = await EmployeeService.getWorkload(admin);
		return ok(result);
	} catch (err) {
		console.error("[employees:workload:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
