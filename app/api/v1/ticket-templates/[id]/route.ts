import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { ROLES } from "@/configs/rbac.config";
import { prisma } from "@/lib/infra/prisma";

const updateSchema = z.object({
	name:                z.string().min(1).max(100).optional(),
	is_shared:           z.boolean().optional(),
	ticket_type:         z.string().optional().nullable(),
	priority:            z.string().optional().nullable(),
	title:               z.string().max(300).optional().nullable(),
	description:         z.string().max(5000).optional().nullable(),
	implementation_plan: z.string().max(5000).optional().nullable(),
	rollback_plan:       z.string().max(5000).optional().nullable(),
	links:               z.array(z.object({ url: z.string(), label: z.string().optional() })).max(20).optional().nullable(),
});

async function getTemplateAndCheck(id: string, userId: string, isAdmin: boolean) {
	const template = await prisma.ticketTemplate.findUnique({ where: { id } });
	if (!template) throw Object.assign(new Error("Not found"), { status: 404 });
	if (template.user_id !== userId && !isAdmin) throw Object.assign(new Error("Forbidden"), { status: 403 });
	return template;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;

		await getTemplateAndCheck(id, user.id, isAdmin);

		const body = await request.json();
		const parsed = updateSchema.safeParse(body);
		if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input", 400);

		// Only admin can toggle is_shared
		const data = { ...parsed.data };
		if (!isAdmin) delete data.is_shared;

		const updated = await prisma.ticketTemplate.update({ where: { id }, data });
		return ok(updated);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[ticket-templates:PUT]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;

		await getTemplateAndCheck(id, user.id, isAdmin);
		await prisma.ticketTemplate.delete({ where: { id } });
		return ok({ success: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[ticket-templates:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
