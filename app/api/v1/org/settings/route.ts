import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await prisma.organization.findUnique({
			where: { id: orgId },
			select: { attachments_enabled: true, departments_enabled: true, org_join_code: true, name: true },
		});
		if (!org) return errorResponse("Organization not found", 404);

		return ok({
			attachments_enabled: org.attachments_enabled,
			departments_enabled: org.departments_enabled,
			org_join_code: org.org_join_code,
			name: org.name,
		});
	} catch (e) {
		console.error("[GET /org/settings]", e);
		return errorResponse("Internal server error", 500);
	}
}

const patchSchema = z.object({
	attachments_enabled: z.boolean().optional(),
	departments_enabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
	try {
		const user = await requireAdmin();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const body = await req.json();
		const parsed = patchSchema.safeParse(body);
		if (!parsed.success) return errorResponse(parsed.error.message, 400);

		const updateData: Record<string, boolean> = {};
		if (parsed.data.attachments_enabled !== undefined) updateData.attachments_enabled = parsed.data.attachments_enabled;
		if (parsed.data.departments_enabled !== undefined) updateData.departments_enabled = parsed.data.departments_enabled;

		const org = await prisma.organization.update({
			where: { id: orgId },
			data: updateData,
			select: { attachments_enabled: true, departments_enabled: true },
		});

		return ok({ attachments_enabled: org.attachments_enabled, departments_enabled: org.departments_enabled });
	} catch (e) {
		console.error("[PATCH /org/settings]", e);
		return errorResponse("Internal server error", 500);
	}
}
