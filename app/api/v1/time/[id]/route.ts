import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { auditLog } from "@/lib/utils/audit";
import * as TimeService from "@/services/time.service";

const stopSchema = z.object({
	title: z.string().max(200).optional(),
	description: z.string().max(1000).optional(),
});

const editSchema = z.object({
	title: z.string().max(200).optional(),
	description: z.string().max(1000).optional(),
	start_time: z.string().datetime({ offset: true }).optional(),
	end_time: z.string().datetime({ offset: true }).optional(),
});

// PATCH /api/v1/time/:id — stop the active timer
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;
		const body = await request.json().catch(() => ({}));
		const validated = stopSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const result = await TimeService.stopTimer(id, user, validated.data);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[time/:id:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}

// PUT /api/v1/time/:id — edit a completed entry
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;
		const body = await request.json().catch(() => ({}));
		const validated = editSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const result = await TimeService.updateEntry(id, user, validated.data);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[time/:id:PUT]", err);
		return errorResponse("Internal server error", 500);
	}
}

// DELETE /api/v1/time/:id — delete a time entry
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;
		await TimeService.deleteEntry(id, user);
		return ok({ deleted: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[time/:id:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}

