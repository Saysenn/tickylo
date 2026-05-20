import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";

const schema = z.object({
	reason: z.string().max(500).optional(),
});

export async function GET() {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const request = await prisma.orgDeletionRequest.findUnique({
			where: { org_id: orgId },
			select: { id: true, status: true, reason: true, reject_reason: true, created_at: true },
		});

		return ok({ request });
	} catch (err: any) {
		console.error("[org/deletion-request:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(req: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await prisma.organization.findUnique({
			where: { id: orgId },
			select: { id: true, name: true },
		});
		if (!org) return errorResponse("Organization not found", 404);

		const existing = await prisma.orgDeletionRequest.findUnique({ where: { org_id: orgId } });
		if (existing?.status === "pending") {
			return errorResponse("A deletion request is already pending super admin review.", 400);
		}

		const body = schema.safeParse(await req.json().catch(() => ({})));
		if (!body.success) return errorResponse("Invalid input", 400);

		// Upsert — allow re-requesting after a rejection
		const request = await prisma.orgDeletionRequest.upsert({
			where:  { org_id: orgId },
			update: { status: "pending", reason: body.data.reason, reject_reason: null, reviewed_at: null, requested_by: admin.id },
			create: { org_id: orgId, requested_by: admin.id, reason: body.data.reason },
		});

		// Notify all super admins
		const superAdmins = await prisma.user.findMany({
			where: { role: "super_admin" },
			select: { id: true },
		});
		if (superAdmins.length > 0) {
			await prisma.notification.createMany({
				data: superAdmins.map((sa) => ({
					user_id: sa.id,
					type:    "org_deletion_requested",
					title:   "Org deletion requested",
					body:    `${org.name} has submitted a deletion request.`,
					link:    "/super-admin/dashboard",
				})),
			});
		}

		return ok({ request });
	} catch (err: any) {
		console.error("[org/deletion-request:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
