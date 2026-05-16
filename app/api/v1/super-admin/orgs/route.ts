import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse } from "@/lib/utils/response";

export async function GET() {
	try {
		const caller = await requireSuperAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const orgs = await prisma.organization.findMany({
			select: {
				id: true,
				name: true,
				slug: true,
				plan: true,
				seat_count: true,
				is_internal: true,
				created_at: true,
				_count: { select: { users: true } },
			},
			orderBy: { created_at: "desc" },
		});

		return NextResponse.json(orgs);
	} catch (err) {
		console.error("[super-admin/orgs:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
