import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { withOrg } from "@/lib/utils/org-filter";

type RequestType = "reopen" | "transfer" | "due_date";

const MODEL_MAP = {
	reopen: "reopenRequest",
	transfer: "transferRequest",
	due_date: "dueDateRequest",
} as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;
		const body = await req.json();
		const type = body.type as RequestType | undefined;
		if (!type || !MODEL_MAP[type]) return errorResponse("Invalid request type", 400);

		const orgId = user.app_metadata?.org_id as string | undefined;
		const model = MODEL_MAP[type];

		const existing = await (prisma[model] as any).findFirst({
			where: withOrg(orgId, { id, requested_by: user.id }),
		});

		if (!existing) return errorResponse("Request not found", 404);
		if (existing.status !== "pending") return errorResponse("Only pending requests can be withdrawn", 400);

		const updated = await (prisma[model] as any).update({
			where: { id },
			data: { status: "cancelled" },
		});

		return ok(updated);
	} catch (err) {
		console.error("[my-requests:cancel]", err);
		return errorResponse("Internal server error", 500);
	}
}
