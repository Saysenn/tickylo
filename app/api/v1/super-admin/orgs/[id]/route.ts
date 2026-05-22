import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";

const VALID_PLANS = ["pending", "unpaid", "trial", "business", "enterprise", "cancelled"] as const;

const bodySchema = z.object({
	is_internal: z.boolean().optional(),
	plan: z.enum(VALID_PLANS).optional(),
});

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const caller = await requireSuperAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const { id } = await params;
		const body = bodySchema.safeParse(await req.json());
		if (!body.success) return errorResponse(body.error.issues[0]?.message ?? "Invalid input", 400);

		const updateData: Record<string, unknown> = {};
		if (body.data.is_internal !== undefined) updateData.is_internal = body.data.is_internal;
		if (body.data.plan !== undefined) updateData.plan = body.data.plan;

		const org = await prisma.organization.update({
			where: { id },
			data: updateData,
			select: { id: true, name: true, plan: true, is_internal: true },
		});

		return ok(org);
	} catch (err) {
		console.error("[super-admin/orgs/[id]:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
