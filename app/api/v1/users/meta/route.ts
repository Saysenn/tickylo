import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";

const ALLOWED_FIELDS = [
	"phone",
	"address",
	"passport_number",
	"visa_status",
	"visa_expiry",
	"dob",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

// GET /api/v1/users/meta — returns the current user's UserMetaData
export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const meta = await prisma.userMetaData.findUnique({
			where: { user_id: user.id },
		});

		return ok(meta ?? null);
	} catch (err) {
		console.error("[users:meta:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

// PATCH /api/v1/users/meta — upserts the current user's editable metadata fields
export async function PATCH(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json();

		// Build update object from allowed fields only
		const data: Record<string, string | Date | null> = {};
		for (const field of ALLOWED_FIELDS) {
			if (!(field in body)) continue;
			const value = body[field as AllowedField];
			if (field === "dob" || field === "visa_expiry") {
				// Empty string → null; otherwise parse as Date
				data[field] = value ? new Date(value) : null;
			} else {
				data[field] = value === "" ? null : value;
			}
		}

		const meta = await prisma.userMetaData.upsert({
			where: { user_id: user.id },
			update: data,
			create: { user_id: user.id, ...data },
		});

		return ok(meta);
	} catch (err) {
		console.error("[users:meta:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
