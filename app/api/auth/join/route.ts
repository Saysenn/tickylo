import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, errorResponse } from "@/lib/utils/response";

const schema = z.object({
	org_join_code: z.string().min(1),
	name:          z.string().min(2).max(100),
	email:         z.string().email(),
	password:      z.string().min(8),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			return errorResponse(parsed.error.issues[0].message, 400);
		}

		const { org_join_code, name, email, password } = parsed.data;

		// Validate org_join_code
		const org = await prisma.organization.findUnique({
			where: { org_join_code },
			select: { id: true, name: true },
		});
		if (!org) return errorResponse("Invalid join code", 404);

		const supabase = createAdminClient();

		// Create Supabase auth user
		const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { full_name: name },
			app_metadata:  { role: "employee", org_id: org.id },
		});
		if (authErr) {
			if (authErr.message.includes("already been registered")) {
				return errorResponse("An account with this email already exists.", 409);
			}
			return errorResponse(authErr.message, 400);
		}

		const userId = authData.user.id;

		// Create Prisma user row
		await prisma.user.upsert({
			where: { id: userId },
			update: { org_id: org.id, role: "employee", name },
			create: { id: userId, email, name, org_id: org.id, role: "employee" },
		});

		// Create join request for admin to approve
		await prisma.userJoinRequest.create({
			data: { org_id: org.id, user_id: userId },
		});

		return ok({ message: "Join request submitted. Your admin will approve your access." });
	} catch (err) {
		console.error("[auth/join]", err);
		return errorResponse("Internal server error", 500);
	}
}
