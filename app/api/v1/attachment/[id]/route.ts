import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as StorageService from "@/services/storage.service";
import { prisma } from "@/lib/infra/prisma";
import { ROLES } from "@/configs/rbac.config";

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;
		const attachment = await prisma.ticketAttachment.findUnique({ where: { id } });
		if (!attachment) return errorResponse("Not found", 404);

		const isAdmin = (user.app_metadata?.role as string | undefined) === ROLES.ADMIN;
		const isOwner = attachment.user_id === user.id;
		if (!isAdmin && !isOwner) return errorResponse("Forbidden", 403);

		const orgId = user.app_metadata?.org_id as string | undefined;
		if (orgId) {
			await StorageService.deleteFile(orgId, attachment.storage_key).catch(() => {});
		}

		await prisma.ticketAttachment.delete({ where: { id } });
		return ok({ ok: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[attachment:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
