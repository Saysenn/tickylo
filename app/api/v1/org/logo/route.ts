import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as StorageService from "@/services/storage.service";
import { prisma } from "@/lib/infra/prisma";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const formData = await request.formData();
		const file = formData.get("file");
		if (!file || !(file instanceof File)) return errorResponse("No file provided", 400);

		const mimeType = file.type || "image/png";
		if (!ALLOWED_MIME.includes(mimeType))
			return errorResponse("Only PNG, JPEG, WebP, or SVG allowed", 400);
		if (file.size > MAX_BYTES)
			return errorResponse("Logo must be under 2 MB", 400);

		const buffer   = Buffer.from(await file.arrayBuffer());
		const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
		const storageKey = `${orgId}/logo/${Date.now()}_${safeName}`;

		const { url } = await StorageService.uploadFile(orgId, buffer, safeName, mimeType, storageKey);

		await prisma.organization.update({
			where: { id: orgId },
			data:  { logo_url: url },
		});

		return ok({ logo_url: url });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[org/logo:POST]", err);
		return errorResponse("Failed to upload logo", 500);
	}
}

export async function DELETE() {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		await prisma.organization.update({
			where: { id: orgId },
			data:  { logo_url: null },
		});

		return ok({ logo_url: null });
	} catch (err: any) {
		console.error("[org/logo:DELETE]", err);
		return errorResponse("Failed to remove logo", 500);
	}
}
