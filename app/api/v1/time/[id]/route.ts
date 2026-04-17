import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { notifyAdmins } from "@/lib/utils/create-notification";
import { formatDurationMs } from "@/lib/utils/format";

const stopSchema = z.object({
	title: z.string().max(200).optional(),
	description: z.string().max(1000).optional(),
});

// PATCH /api/v1/time/:id — stop the timer
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		// check if id exist
		const { id } = await params;
		if (!id) return errorResponse("Time entry not found", 404);

		// get current user
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// Verify if an entry exists and is active and owned by user
		const entry = await prisma.timeEntry.findFirst({
			where: { id, user_id: user.id, end_time: null },
		});
		if (!entry) return errorResponse("Active entry not found", 404);

		// parse request body
		const body = await request.json().catch(() => ({}));
		const validated = stopSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const endTime = new Date();
		const updated = await prisma.timeEntry.update({
			where: { id },
			data: {
				end_time: endTime,
				title: validated.data.title,
				description: validated.data.description,
			},
		});

		const name = user.user_metadata?.name ?? user.email ?? "An employee";
		const durationMs = endTime.getTime() - entry.start_time.getTime();
		const duration = formatDurationMs(durationMs);
		notifyAdmins({
			type: "time_clock_out",
			title: "Employee clocked out",
			body: `${name} clocked out after ${duration}${updated.title ? ` — "${updated.title}"` : ""}.`,
			link: "/dashboard/time-manager",
		}).catch(() => {});

		return ok(updated);
	} catch (err) {
		console.error("[time/:id:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
