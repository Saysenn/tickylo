import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as NotificationsService from "@/services/notifications.service";

const bulkSchema = z.object({ ids: z.array(z.string()).min(1).max(200) });

export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { searchParams } = new URL(request.url);
		const result = await NotificationsService.listNotifications(user, {
			page: Number(searchParams.get("page") ?? 1),
			limit: Number(searchParams.get("limit") ?? 20),
			unread_only: searchParams.get("unread_only") === "true",
		});
		return ok(result);
	} catch (err) {
		console.error("[notifications:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const body = await request.json().catch(() => ({}));
		const parsed = bulkSchema.safeParse(body);
		if (!parsed.success) return errorResponse("Invalid input", 400);
		const result = await NotificationsService.bulkDeleteNotifications(parsed.data.ids, user);
		return ok(result);
	} catch (err) {
		console.error("[notifications:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const body = await request.json().catch(() => ({}));
		const parsed = bulkSchema.safeParse(body);
		if (!parsed.success) return errorResponse("Invalid input", 400);
		const result = await NotificationsService.bulkMarkRead(parsed.data.ids, user);
		return ok(result);
	} catch (err) {
		console.error("[notifications:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
