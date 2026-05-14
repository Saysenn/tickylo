import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { getSessionOrg, isSessionOrg } from "@/lib/auth/get-session-org";
import { prisma } from "@/lib/infra/prisma";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getSessionOrg();
		if (!isSessionOrg(session)) return session;
		const { id } = await params;

		const entries = await prisma.timeEntry.findMany({
			where: {
				ticket_id: id,
				end_time: { not: null },
				...(session.orgId ? { org_id: session.orgId } : {}),
			},
			orderBy: { start_time: "desc" },
			select: {
				id: true,
				start_time: true,
				end_time: true,
				auto_closed: true,
				flagged: true,
				user: { select: { id: true, name: true, email: true } },
			},
		});

		return ok(entries);
	} catch (err) {
		console.error("[ticket:time:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
