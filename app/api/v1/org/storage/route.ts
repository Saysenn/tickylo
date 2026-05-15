import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as StorageService from "@/services/storage.service";

const supabaseSchema = z.object({
	provider: z.literal("supabase"),
	url: z.string().url(),
	service_key: z.string().min(1),
	bucket: z.string().min(1),
});

const s3Schema = z.object({
	provider: z.literal("s3"),
	region: z.string().min(1),
	bucket: z.string().min(1),
	access_key_id: z.string().min(1),
	secret_access_key: z.string().min(1),
});

const putSchema = z.union([supabaseSchema, s3Schema]);

export async function GET() {
	try {
		const user = await requireAdmin();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const safe = await StorageService.getOrgStorageSafe(orgId);
		return ok(safe ?? null);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[org:storage:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const user = await requireAdmin();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const body = await request.json();
		const validated = putSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		await StorageService.upsertOrgStorage(orgId, validated.data);
		return ok({ ok: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[org:storage:PUT]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest) {
	// Test connection without saving
	try {
		const user = await requireAdmin();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json();
		const validated = putSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		await StorageService.testConnection(validated.data);
		return ok({ ok: true, message: "Connection successful" });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		return errorResponse(err.message ?? "Connection test failed", 500);
	}
}
