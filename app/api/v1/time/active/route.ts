import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ok, errorResponse } from "@/lib/response";

// GET /api/v1/time/active — returns the current user's open time entry or null
export async function GET() {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const entry = await prisma.timeEntry.findFirst({
			where: { user_id: user.id, end_time: null },
			orderBy: { start_time: "desc" },
		});

		/** this will return the left time in seconds and will make sure whatever happens your timer continues */
		return ok(entry);
	} catch (err) {
		console.error("[time/active:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
