import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";

const bodySchema = z.object({
	is_internal: z.boolean(),
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

		const org = await prisma.organization.update({
			where: { id },
			data:  { is_internal: body.data.is_internal },
			select: { id: true, name: true, is_internal: true },
		});

		return ok(org);
	} catch (err) {
		console.error("[super-admin/orgs/[id]:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
