import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const { id } = await params;
		const invoice = await prisma.invoice.findUnique({ where: { id }, select: { org_id: true } });
		if (!invoice || invoice.org_id !== orgId) return errorResponse("Invoice not found", 404);

		await prisma.invoice.delete({ where: { id } });
		return ok({ success: true });
	} catch (e) {
		console.error("[DELETE /api/v1/invoices/[id]]", e);
		return errorResponse("Internal server error", 500);
	}
}
