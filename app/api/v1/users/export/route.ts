import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse } from "@/lib/utils/response";
import { auditLog } from "@/lib/utils/audit";

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const [metadata, time_entries, tickets, leave_records] = await Promise.all([
			prisma.userMetaData.findUnique({ where: { user_id: user.id } }),
			prisma.timeEntry.findMany({
				where: { user_id: user.id },
				orderBy: { start_time: "desc" },
				take: 1000,
			}),
			prisma.ticket.findMany({
				where: { created_by: user.id },
				select: { id: true, title: true, status: true, created_at: true },
			}),
			prisma.leave.findMany({ where: { user_id: user.id } }),
		]);

		auditLog({
			actor_id: user.id,
			actor_role: user.app_metadata?.role ?? "employee",
			action: "EXPORT",
			entity_type: "data_export",
			entity_id: user.id,
		});

		const today = new Date().toISOString().slice(0, 10);
		const payload = {
			exported_at: new Date().toISOString(),
			user: {
				id: user.id,
				email: user.email,
				name: user.user_metadata?.name ?? null,
				role: user.app_metadata?.role ?? null,
			},
			metadata,
			time_entries,
			tickets,
			leave_records,
		};

		return new NextResponse(JSON.stringify(payload, null, 2), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Content-Disposition": `attachment; filename="my-data-${today}.json"`,
			},
		});
	} catch (err) {
		console.error("[users:export:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
