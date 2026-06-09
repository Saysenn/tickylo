import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { ROLES } from "@/configs/rbac.config";
import { prisma } from "@/lib/infra/prisma";

const schema = z.object({
	primary_id:  z.string().min(1),
	ticket_ids:  z.array(z.string().min(1)).min(1).max(4),
});

export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const role = user.app_metadata?.role as string | undefined;
		const isAdmin = role === ROLES.ADMIN;

		if (!isAdmin) {
			const org = await prisma.organization.findUnique({
				where: { id: orgId },
				select: { employees_can_merge_tickets: true },
			});
			if (!org?.employees_can_merge_tickets) {
				return errorResponse("You do not have permission to merge tickets.", 403);
			}
		}

		const body = await request.json();
		const parsed = schema.safeParse(body);
		if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input", 400);

		const { primary_id, ticket_ids } = parsed.data;

		if (ticket_ids.includes(primary_id)) {
			return errorResponse("Primary ticket cannot also be in the merge list.", 400);
		}

		// Verify all tickets belong to this org and exist
		const allIds = [primary_id, ...ticket_ids];
		const tickets = await prisma.ticket.findMany({
			where: { id: { in: allIds }, org_id: orgId },
			select: { id: true, title: true, status: true },
		});

		if (tickets.length !== allIds.length) {
			return errorResponse("One or more tickets not found or do not belong to this organization.", 404);
		}

		const primary = tickets.find((t) => t.id === primary_id);
		if (!primary) return errorResponse("Primary ticket not found.", 404);

		if (primary.status === "closed") {
			return errorResponse("Cannot merge into a closed ticket.", 400);
		}

		const mergedTitles = tickets
			.filter((t) => t.id !== primary_id)
			.map((t) => `"${t.title}"`)
			.join(", ");

		await prisma.$transaction(async (tx) => {
			// Move comments, time entries, subtasks, watchers from merged tickets to primary
			await tx.ticketComment.updateMany({
				where: { task_id: { in: ticket_ids } },
				data:  { task_id: primary_id },
			});
			await tx.timeEntry.updateMany({
				where: { ticket_id: { in: ticket_ids } },
				data:  { ticket_id: primary_id },
			});
			await tx.ticketSubtask.updateMany({
				where: { task_id: { in: ticket_ids } },
				data:  { task_id: primary_id },
			});

			// Merge watchers — add any watcher from merged tickets not already watching primary
			const existingWatcherIds = await tx.ticketWatcher.findMany({
				where: { task_id: primary_id },
				select: { user_id: true },
			});
			const existingSet = new Set(existingWatcherIds.map((w) => w.user_id));

			const incomingWatchers = await tx.ticketWatcher.findMany({
				where: { task_id: { in: ticket_ids } },
				select: { user_id: true },
			});
			const newWatchers = incomingWatchers
				.filter((w) => !existingSet.has(w.user_id))
				.map((w) => ({ task_id: primary_id, user_id: w.user_id }));

			if (newWatchers.length > 0) {
				await tx.ticketWatcher.createMany({ data: newWatchers, skipDuplicates: true });
			}

			// Delete orphaned pending requests — no longer actionable once ticket is closed
			await tx.dueDateRequest.deleteMany({ where: { task_id: { in: ticket_ids } } });
			await tx.reopenRequest.deleteMany({ where: { task_id: { in: ticket_ids } } });
			await tx.transferRequest.deleteMany({ where: { task_id: { in: ticket_ids } } });

			// Delete orphaned watchers from merged tickets (already migrated above)
			await tx.ticketWatcher.deleteMany({ where: { task_id: { in: ticket_ids } } });

			// Close merged tickets and leave a system comment on each
			await tx.ticket.updateMany({
				where: { id: { in: ticket_ids } },
				data: { status: "closed" },
			});
			const actor = isAdmin ? "an administrator" : "a team member";
			await tx.ticketComment.createMany({
				data: ticket_ids.map((id) => ({
					task_id:   id,
					user_id:   null,
					body:      `This ticket was merged into "${primary.title}" by ${actor}.`,
					is_system: true,
				})),
			});

			// System comment on the primary noting what was absorbed
			await tx.ticketComment.create({
				data: {
					task_id:   primary_id,
					user_id:   null,
					body:      `Tickets ${mergedTitles} were merged into this ticket by ${actor}.`,
					is_system: true,
				},
			});
		});

		return ok({ success: true, primary_id });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:merge:POST]", err);
		return errorResponse("Failed to merge tickets", 500);
	}
}
