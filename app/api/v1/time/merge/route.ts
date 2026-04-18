import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { ROLES } from "@/configs/rbac.config";

const mergeSchema = z.object({
	ids: z.array(z.string().cuid()).min(2, "Select at least 2 entries to merge"),
	title: z.string().max(200).optional(),
});

/**
 * POST /api/v1/time/merge
 * Merges 2+ completed time entries into a single entry.
 * The merged entry has:
 *   - start_time = earliest start across all entries
 *   - end_time   = start_time + sum of all durations (preserves total, not a continuous block)
 *   - title      = provided title, or the first entry's title
 *   - ticket_id  = ticket_id of the first entry (if all share the same ticket, otherwise null)
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;

		const body = await request.json().catch(() => ({}));
		const validated = mergeSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const { ids, title } = validated.data;

		const entries = await prisma.timeEntry.findMany({
			where: {
				id: { in: ids },
				end_time: { not: null },
				...(isAdmin ? {} : { user_id: user.id }),
			},
			orderBy: { start_time: "asc" },
		});

		if (entries.length !== ids.length) {
			return errorResponse("One or more entries not found or still active", 404);
		}

		// All must belong to the same user
		const ownerIds = new Set(entries.map((e) => e.user_id));
		if (ownerIds.size > 1) return errorResponse("Cannot merge entries from different employees", 400);

		const totalMs = entries.reduce((sum, e) => {
			return sum + (new Date(e.end_time!).getTime() - new Date(e.start_time).getTime());
		}, 0);

		const startTime = new Date(entries[0].start_time);
		const endTime   = new Date(startTime.getTime() + totalMs);

		// Use shared ticket_id only if all entries point to the same ticket
		const ticketIds = new Set(entries.map((e) => e.ticket_id));
		const sharedTicketId = ticketIds.size === 1 ? entries[0].ticket_id : null;

		const merged = await prisma.$transaction(async (tx) => {
			await tx.timeEntry.deleteMany({ where: { id: { in: ids } } });
			return tx.timeEntry.create({
				data: {
					user_id: entries[0].user_id,
					start_time: startTime,
					end_time: endTime,
					title: title ?? entries[0].title ?? null,
					ticket_id: sharedTicketId,
				},
			});
		});

		return ok(merged);
	} catch (err) {
		console.error("[time:merge:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
