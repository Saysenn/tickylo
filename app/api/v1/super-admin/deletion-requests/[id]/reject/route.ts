import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { createNotification } from "@/lib/utils/create-notification";

const schema = z.object({
	reason: z.string().max(500).optional(),
});

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const caller = await requireSuperAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const { id } = await params;

		const request = await prisma.orgDeletionRequest.findUnique({
			where:   { id },
			include: { org: { select: { name: true } } },
		});
		if (!request) return errorResponse("Request not found", 404);
		if (request.status !== "pending") return errorResponse("Request already reviewed", 400);

		const body = schema.safeParse(await req.json().catch(() => ({})));
		const rejectReason = body.success ? body.data.reason : undefined;

		await prisma.orgDeletionRequest.update({
			where: { id },
			data:  { status: "rejected", reject_reason: rejectReason ?? null, reviewed_at: new Date() },
		});

		createNotification({
			user_id: request.requested_by,
			type:    "org_deletion_rejected",
			title:   "Deletion request rejected",
			body:    rejectReason
				? `Your deletion request for ${request.org.name} was rejected: ${rejectReason}`
				: `Your deletion request for ${request.org.name} was rejected.`,
			link: "/dashboard/settings/organization",
		}).catch(() => {});

		return ok({ rejected: true });
	} catch (err: any) {
		console.error("[super-admin/deletion-requests/reject:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
