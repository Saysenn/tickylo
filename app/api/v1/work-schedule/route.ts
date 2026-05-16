import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { getSessionOrg, isSessionOrg } from "@/lib/auth/get-session-org";
import { getWorkSchedule, upsertWorkSchedule } from "@/services/work-schedule.service";

const workScheduleSchema = z.object({
	timezone: z.string().min(1),
	shift_start: z.string().regex(/^\d{2}:\d{2}$/),
	shift_end: z.string().regex(/^\d{2}:\d{2}$/),
	working_days: z.array(z.number().int().min(0).max(6)).min(1),
	daily_cap_h: z.number().min(0.5).max(24),
	max_timer_hours: z.number().min(1).max(72).nullable().default(null),
});

// GET — any authenticated user (employees need read-only view)
export async function GET() {
	try {
		const session = await getSessionOrg();
		if (!isSessionOrg(session)) return session;
		if (!session.orgId) return errorResponse("No organization", 400);

		const schedule = await getWorkSchedule(session.orgId);
		return ok(schedule ?? null);
	} catch {
		return errorResponse("Failed to fetch work schedule", 500);
	}
}

// PUT — admin only
export async function PUT(req: NextRequest) {
	try {
		const session = await getSessionOrg();
		if (!isSessionOrg(session)) return session;
		if (!session.isAdmin) return errorResponse("Forbidden", 403);
		if (!session.orgId) return errorResponse("No organization", 400);

		const body = await req.json();
		const parsed = workScheduleSchema.safeParse(body);
		if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input", 400);

		if (parsed.data.shift_end <= parsed.data.shift_start) {
			return errorResponse("Shift end must be after shift start", 400);
		}

		const schedule = await upsertWorkSchedule(session.orgId, parsed.data);
		return ok(schedule);
	} catch {
		return errorResponse("Failed to save work schedule", 500);
	}
}
