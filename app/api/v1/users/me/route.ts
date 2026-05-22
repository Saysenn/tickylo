import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { z } from "zod";

const TIME_REGEX = /^\d{2}:\d{2}$/;

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const row = await prisma.user.findUnique({
			where: { id: user.id },
			select: { id: true, name: true, email: true, timezone: true, shift_start: true, shift_end: true, onboarding_completed: true },
		});
		return ok(row);
	} catch (err) {
		console.error("[users:me:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

const PatchSchema = z.object({
	timezone:             z.string().min(1).max(64).optional(),
	shift_start:          z.string().regex(TIME_REGEX, "shift_start must be HH:MM").nullable().optional(),
	shift_end:            z.string().regex(TIME_REGEX, "shift_end must be HH:MM").nullable().optional(),
	onboarding_completed: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const body = await request.json();
		const parsed = PatchSchema.safeParse(body);
		if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "Invalid request", 400);
		const row = await prisma.user.update({
			where: { id: user.id },
			data: parsed.data,
			select: { id: true, name: true, email: true, timezone: true, shift_start: true, shift_end: true, onboarding_completed: true },
		});
		return ok(row);
	} catch (err) {
		console.error("[users:me:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
