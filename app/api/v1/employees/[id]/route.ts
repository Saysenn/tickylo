import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, errorResponse } from "@/lib/utils/response";
import { ROLES } from "@/configs/rbac.config";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";

const updateEmployeeSchema = z.object({
	name: z.string().min(2).max(100).optional(),
	role: z.enum([ROLES.ADMIN, ROLES.EMPLOYEE]).optional(),
});

/**
 * GET /api/v1/employees/[id] — admin only
 * Returns full employee profile: auth data + metadata + leaves + tasks + time summary
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const { id } = await params;

		const admin = createAdminClient();
		const { data, error } = await admin.auth.admin.getUserById(id);
		if (error || !data?.user) return errorResponse("Employee not found", 404);

		const u = data.user;

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const [meta, leaves, tasks, timeEntries] = await Promise.all([
			prisma.userMetaData.findUnique({ where: { user_id: id } }),
			prisma.leave.findMany({
				where: { user_id: id },
				orderBy: { created_at: "desc" },
				take: 10,
			}),
			prisma.task.findMany({
				where: { user_id: id },
				orderBy: { created_at: "desc" },
				take: 10,
			}),
			prisma.timeEntry.findMany({
				where: { user_id: id, start_time: { gte: thirtyDaysAgo }, end_time: { not: null } },
				orderBy: { start_time: "desc" },
				take: 20,
			}),
		]);

		// Compute total ms from time entries
		const totalTimeMs = timeEntries.reduce((acc, entry) => {
			if (!entry.end_time) return acc;
			return acc + (entry.end_time.getTime() - entry.start_time.getTime());
		}, 0);

		return ok({
			id: u.id,
			email: u.email ?? "",
			name: (u.user_metadata?.full_name ?? u.user_metadata?.name ?? null) as string | null,
			avatar_url: (u.user_metadata?.avatar_url ?? null) as string | null,
			role: u.app_metadata?.role ?? ROLES.EMPLOYEE,
			created_at: u.created_at,
			last_sign_in_at: u.last_sign_in_at ?? null,
			meta: meta ?? null,
			leaves,
			tasks,
			timeEntries,
			totalTimeMs,
		});
	} catch (err) {
		console.error("[employees:GET:id]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * PATCH /api/v1/employees/[id] — update name and/or role
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const { id } = await params;
		const body = await request.json();
		const validated = updateEmployeeSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const { name, role } = validated.data;
		const admin = createAdminClient();

		const updatePayload: Parameters<typeof admin.auth.admin.updateUserById>[1] = {};
		if (name) updatePayload.user_metadata = { full_name: name };
		if (role) updatePayload.app_metadata = { role };

		const { data, error } = await admin.auth.admin.updateUserById(id, updatePayload);
		if (error) return errorResponse(error.message, 400);

		return ok({ id: data.user.id, name, role });
	} catch (err) {
		console.error("[employees:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * DELETE /api/v1/employees/[id] — delete user
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const { id } = await params;

		if (caller.id === id)
			return errorResponse("Cannot delete your own account", 400);

		const admin = createAdminClient();
		const { error } = await admin.auth.admin.deleteUser(id);
		if (error) return errorResponse(error.message, 400);

		return ok({ success: true });
	} catch (err) {
		console.error("[employees:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
