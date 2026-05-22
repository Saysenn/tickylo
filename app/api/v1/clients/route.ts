import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import z from "zod";

const createClientSchema = z.object({
	name: z.string().min(1).max(200),
	email: z.string().email().max(200).optional().nullable(),
	phone: z.string().max(50).optional().nullable(),
	currency: z.string().max(10).optional(),
	rate_type: z.enum(["hourly", "fixed", "none"]).optional(),
	hourly_rate: z.number().nonnegative().optional(),
	discount_percent: z.number().min(0).max(100).optional(),
});

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const clients = await prisma.client.findMany({
			where: { org_id: orgId },
			orderBy: { name: "asc" },
			include: { _count: { select: { tickets: true } } },
		});

		return ok({ data: clients });
	} catch (err) {
		console.error("[clients:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const body = await request.json();
		const parsed = createClientSchema.safeParse(body);
		if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid input", 400);

		const { name, email, phone, currency, rate_type, hourly_rate, discount_percent } = parsed.data;

		// Check unique [org_id, name]
		const existing = await prisma.client.findUnique({ where: { org_id_name: { org_id: orgId, name } } });
		if (existing) return errorResponse("A client with this name already exists.", 409);

		const client = await prisma.client.create({
			data: {
				org_id: orgId,
				name,
				email: email ?? null,
				phone: phone ?? null,
				currency: currency ?? "USD",
				rate_type: rate_type ?? "hourly",
				hourly_rate: hourly_rate ?? 0,
				discount_percent: discount_percent ?? 0,
			},
			include: { _count: { select: { tickets: true } } },
		});

		return ok(client, 201);
	} catch (err) {
		console.error("[clients:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
