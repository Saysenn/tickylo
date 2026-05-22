import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import z from "zod";

const updateClientSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	email: z.string().email().max(200).optional().nullable(),
	phone: z.string().max(50).optional().nullable(),
	currency: z.string().max(10).optional(),
	rate_type: z.enum(["hourly", "fixed", "none"]).optional(),
	hourly_rate: z.number().nonnegative().optional(),
	discount_percent: z.number().min(0).max(100).optional(),
	billing_cycle: z.enum(["per_ticket", "monthly", "per_project"]).optional(),
	payment_terms: z.enum(["due_on_receipt", "net_15", "net_30", "net_60"]).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const { id } = await params;

		const client = await prisma.client.findFirst({
			where: { id, org_id: orgId },
			include: { _count: { select: { tickets: true } } },
		});
		if (!client) return errorResponse("Client not found", 404);

		return ok(client);
	} catch (err) {
		console.error("[clients/[id]:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const { id } = await params;

		const existing = await prisma.client.findFirst({ where: { id, org_id: orgId } });
		if (!existing) return errorResponse("Client not found", 404);

		const body = await request.json();
		const parsed = updateClientSchema.safeParse(body);
		if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input", 400);

		// Check name uniqueness if name is being changed
		if (parsed.data.name && parsed.data.name !== existing.name) {
			const conflict = await prisma.client.findUnique({ where: { org_id_name: { org_id: orgId, name: parsed.data.name } } });
			if (conflict) return errorResponse("A client with this name already exists.", 409);
		}

		const updated = await prisma.client.update({
			where: { id },
			data: parsed.data,
			include: { _count: { select: { tickets: true } } },
		});

		return ok(updated);
	} catch (err) {
		console.error("[clients/[id]:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const { id } = await params;

		const existing = await prisma.client.findFirst({ where: { id, org_id: orgId } });
		if (!existing) return errorResponse("Client not found", 404);

		// Soft delete
		const updated = await prisma.client.update({
			where: { id },
			data: { deleted_at: new Date() },
		});

		return ok(updated);
	} catch (err) {
		console.error("[clients/[id]:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
