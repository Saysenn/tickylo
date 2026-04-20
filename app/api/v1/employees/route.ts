import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, errorResponse } from "@/lib/utils/response";
import { ROLES, DEFAULT_ROLE, type Role } from "@/configs/rbac.config";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { sendEmail } from "@/lib/email/send";
import { employeeWelcomeEmail } from "@/lib/email/templates";

const createEmployeeSchema = z.object({
	name: z.string().min(2).max(100),
	email: z.string().email(),
	password: z.string().min(8),
	role: z.enum([ROLES.ADMIN, ROLES.EMPLOYEE]).default(ROLES.EMPLOYEE),
});

// GET /api/v1/employees?page=1&limit=10 — paginated user list scoped to org
export async function GET(request: NextRequest) {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const orgId = caller.app_metadata?.org_id as string | undefined;

		const { searchParams } = new URL(request.url);
		const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
		const perPage = Math.min(
			100,
			Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)),
		);
		const skip = (page - 1) * perPage;

		// Use Prisma to scope by org_id (Supabase admin.listUsers has no org filter)
		const [orgUsers, total] = await Promise.all([
			prisma.user.findMany({
				where: orgId ? { org_id: orgId } : {},
				select: { id: true, email: true, name: true, avatar_url: true, role: true, created_at: true },
				orderBy: { created_at: "desc" },
				take: perPage,
				skip,
			}),
			prisma.user.count({ where: orgId ? { org_id: orgId } : {} }),
		]);

		// Augment with Supabase last_sign_in_at
		const supabase = createAdminClient();
		const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
		const authMap = new Map(authData?.users.map((u) => [u.id, u]) ?? []);

		const employees = orgUsers.map((u) => ({
			...u,
			role: (u.role ?? DEFAULT_ROLE) as Role,
			last_sign_in_at: authMap.get(u.id)?.last_sign_in_at ?? null,
		}));

		return ok({ data: employees, page, totalPages: Math.ceil(total / perPage) || 1 });
	} catch (err) {
		console.error("[employees:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

// POST /api/v1/employees — create a new user
export async function POST(request: NextRequest) {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const body = await request.json();
		const validated = createEmployeeSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const { name, email, password, role } = validated.data;
		const orgId = caller.app_metadata?.org_id as string | undefined;

		const admin = createAdminClient();
		const { data, error } = await admin.auth.admin.createUser({
			email,
			password,
			user_metadata: { full_name: name },
			app_metadata: { role, ...(orgId ? { org_id: orgId } : {}) },
			email_confirm: true,
		});

		if (error) return errorResponse(error.message, 400);

		// Create Prisma user row so org_id is searchable
		await prisma.user.upsert({
			where: { id: data.user.id },
			update: { org_id: orgId, role, name },
			create: { id: data.user.id, email, name, org_id: orgId, role },
		});

		// Send welcome email with credentials (fire-and-forget)
		if (orgId) {
			prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } })
				.then((org) => {
					const { subject, html } = employeeWelcomeEmail({
						employeeName: name,
						employeeEmail: email,
						tempPassword: password,
						orgName: org?.name ?? "your organization",
					});
					return sendEmail({ to: email, subject, html });
				})
				.catch(() => {});
		}

		return ok(
			{
				id: data.user.id,
				email: data.user.email,
				name,
				role,
				created_at: data.user.created_at,
			},
			201,
		);
	} catch (err) {
		console.error("[employees:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
