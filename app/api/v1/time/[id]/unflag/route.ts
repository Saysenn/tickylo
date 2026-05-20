import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { auditLog } from "@/lib/utils/audit";
import { createNotification } from "@/lib/utils/create-notification";

export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const { id } = await params;
		const entry = await prisma.timeEntry.findUnique({ where: { id } });
		if (!entry) return errorResponse("Not found", 404);
		if (entry.org_id !== (admin.app_metadata?.org_id as string)) return errorResponse("Forbidden", 403);

		await prisma.timeEntry.update({
			where: { id },
			data: { flagged: false },
		});

		auditLog({
			org_id:      entry.org_id ?? undefined,
			actor_id:    admin.id,
			actor_role:  "admin",
			action:      "UPDATE",
			entity_type: "time_entry",
			entity_id:   id,
			before: { flagged: true },
			after:  { flagged: false, reviewed_by_admin: true },
		});

		if (entry.user_id) {
			createNotification({
				user_id: entry.user_id,
				org_id:  entry.org_id ?? undefined,
				type:    "time_entry_reviewed",
				title:   "Time entry reviewed",
				body:    `A flagged time entry${entry.title ? ` "${entry.title}"` : ""} has been reviewed and cleared by an admin.`,
				link:    "/dashboard/time-tracker",
			}).catch(() => {});
		}

		return ok({ unflagged: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[time/:id/unflag:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
