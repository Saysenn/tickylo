import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { z } from "zod";

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const row = await prisma.user.findUnique({
			where: { id: user.id },
			select: { id: true, name: true, email: true, timezone: true },
		});
		return ok(row);
	} catch (err) {
		console.error("[users:me:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

const PatchSchema = z.object({
	timezone: z.string().min(1).max(64).optional(),
});

export async function PATCH(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const body = await request.json();
		const parsed = PatchSchema.safeParse(body);
		if (!parsed.success) return errorResponse("Invalid request", 400);
		const row = await prisma.user.update({
			where: { id: user.id },
			data: parsed.data,
			select: { id: true, name: true, email: true, timezone: true },
		});
		return ok(row);
	} catch (err) {
		console.error("[users:me:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
