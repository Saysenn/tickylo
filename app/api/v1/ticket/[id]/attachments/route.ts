import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as StorageService from "@/services/storage.service";
import { prisma } from "@/lib/infra/prisma";

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id: ticketId } = await params;

		const comments = await prisma.ticketComment.findMany({
			where: { task_id: ticketId, attachments: { some: {} } },
			select: {
				id: true,
				created_at: true,
				author: { select: { id: true, name: true, email: true } },
				attachments: {
					orderBy: { created_at: "asc" },
					select: {
						id: true, file_name: true, file_size: true, mime_type: true, url: true, created_at: true,
						author: { select: { id: true, name: true, email: true } },
					},
				},
			},
			orderBy: { created_at: "asc" },
		});

		return ok(comments);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[ticket:attachments:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

// Admin only: delete all attachments for this ticket
export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAdmin();
		if (!user) return errorResponse("Unauthorized", 401);

		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const { id: ticketId } = await params;

		const attachments = await prisma.ticketAttachment.findMany({
			where: { comment: { task_id: ticketId } },
		});

		// Delete from cloud storage (best effort per file)
		await Promise.allSettled(
			attachments.map((a) => StorageService.deleteFile(orgId, a.storage_key)),
		);

		await prisma.ticketAttachment.deleteMany({
			where: { id: { in: attachments.map((a) => a.id) } },
		});

		return ok({ deleted: attachments.length });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[ticket:attachments:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
