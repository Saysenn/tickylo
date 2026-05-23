import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";

export async function GET(req: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "reports");
		if (gate) return gate;

		const { searchParams } = new URL(req.url);
		const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
		const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
		const dateFrom = searchParams.get("date_from");
		const dateTo   = searchParams.get("date_to");

		const where: any = { org_id: orgId };
		if (dateFrom) where.generated_at = { ...where.generated_at, gte: new Date(`${dateFrom}T00:00:00.000Z`) };
		if (dateTo)   where.generated_at = { ...where.generated_at, lte: new Date(`${dateTo}T23:59:59.999Z`) };

		const [invoices, total] = await Promise.all([
			prisma.invoice.findMany({
				where,
				include: {
					client: { select: { name: true } },
				},
				orderBy: { generated_at: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			prisma.invoice.count({ where }),
		]);

		const data = invoices.map((inv) => ({
			id:             inv.id,
			invoice_number: inv.invoice_number,
			type:           inv.type,
			client_name:    inv.client?.name ?? null,
			date_from:      inv.date_from.toISOString().split("T")[0],
			date_to:        inv.date_to.toISOString().split("T")[0],
			template_id:    inv.template_id,
			format:         inv.template_id.endsWith("-pdf") ? "pdf" : "xlsx",
			generated_at:   inv.generated_at.toISOString(),
		}));

		return ok({ data, total, page, pages: Math.ceil(total / limit) });
	} catch (e) {
		console.error("[GET /api/v1/invoices]", e);
		return errorResponse("Internal server error", 500);
	}
}
