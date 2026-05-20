import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { ROLES } from "@/configs/rbac.config";
import { prisma } from "@/lib/infra/prisma";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";

const createSchema = z.object({
	name:                z.string().min(1).max(100),
	is_shared:           z.boolean().optional().default(false),
	ticket_type:         z.string().optional(),
	priority:            z.string().optional(),
	title:               z.string().max(300).optional(),
	description:         z.string().max(5000).optional(),
	implementation_plan: z.string().max(5000).optional(),
	rollback_plan:       z.string().max(5000).optional(),
	links:               z.array(z.object({ url: z.string(), label: z.string().optional() })).max(20).optional(),
});

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "ticket_templates");
		if (gate) return gate;

		// Return shared templates + caller's own personal templates
		const templates = await prisma.ticketTemplate.findMany({
			where: {
				org_id: orgId,
				OR: [{ is_shared: true }, { user_id: user.id }],
			},
			orderBy: [{ is_shared: "desc" }, { created_at: "desc" }],
		});

		return ok(templates);
	} catch (err) {
		console.error("[ticket-templates:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "ticket_templates");
		if (gate) return gate;

		const body = await request.json();
		const parsed = createSchema.safeParse(body);
		if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input", 400);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		const isShared = parsed.data.is_shared && isAdmin; // only admin can share

		const template = await prisma.ticketTemplate.create({
			data: { ...parsed.data, is_shared: isShared, org_id: orgId, user_id: user.id },
		});

		return ok(template);
	} catch (err) {
		console.error("[ticket-templates:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
