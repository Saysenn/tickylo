import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as StorageService from "@/services/storage.service";
import { prisma } from "@/lib/infra/prisma";

export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const formData = await request.formData();
		const file = formData.get("file");

		if (!file || !(file instanceof File)) return errorResponse("No file provided", 400);

		const mimeType = file.type || "application/octet-stream";
		const sizeBytes = file.size;

		StorageService.validateFile(mimeType, sizeBytes);

		const buffer = Buffer.from(await file.arrayBuffer());
		const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
		const storageKey = `${orgId}/${Date.now()}_${safeName}`;

		const { key, url } = await StorageService.uploadFile(orgId, buffer, safeName, mimeType, storageKey);

		// comment_id is null until the comment is submitted
		const attachment = await prisma.ticketAttachment.create({
			data: {
				user_id: user.id,
				file_name: file.name,
				file_size: sizeBytes,
				mime_type: mimeType,
				storage_key: key,
				url,
			},
		});

		return ok({ id: attachment.id, url, file_name: file.name, mime_type: mimeType, file_size: sizeBytes });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[upload:POST]", err);
		return errorResponse("Upload failed", 500);
	}
}
