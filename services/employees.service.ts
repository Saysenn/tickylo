import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/infra/prisma";
import { withOrg } from "@/lib/utils/org-filter";
import { auditLog } from "@/lib/utils/audit";
import { sendEmail } from "@/lib/email/send";
import { employeeWelcomeEmail } from "@/lib/email/templates";
import { ROLES, DEFAULT_ROLE, type Role } from "@/configs/rbac.config";
import type { Caller } from "./ticket.service";

const META_FIELDS = [
	"phone",
	"dob",
	"address",
	"passport_number",
	"visa_status",
	"visa_expiry",
	"salary",
	"date_joined",
	"sick_leave",
	"vacation_leave",
	"emergency_leave",
	"personal_leave",
] as const;

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listEmployees(admin: Caller, page = 1, limit = 10) {
	const orgId = admin.app_metadata?.org_id as string | undefined;
	const perPage = Math.min(100, Math.max(1, limit));
	const skip = (Math.max(1, page) - 1) * perPage;

	const [orgUsers, total] = await Promise.all([
		prisma.user.findMany({
			where: withOrg(orgId),
			select: { id: true, email: true, name: true, avatar_url: true, role: true, created_at: true },
			orderBy: { created_at: "desc" },
			take: perPage,
			skip,
		}),
		prisma.user.count({ where: withOrg(orgId) }),
	]);

	const supabase = createAdminClient();
	const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
	const authMap = new Map(authData?.users.map((u) => [u.id, u]) ?? []);

	const employees = orgUsers.map((u) => ({
		...u,
		role: (u.role ?? DEFAULT_ROLE) as Role,
		last_sign_in_at: authMap.get(u.id)?.last_sign_in_at ?? null,
	}));

	return { data: employees, page, totalPages: Math.ceil(total / perPage) || 1 };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreateEmployeeData = {
	name: string;
	email: string;
	password: string;
	role: Role;
};

export async function createEmployee(admin: Caller, data: CreateEmployeeData) {
	const { name, email, password, role } = data;
	const orgId = admin.app_metadata?.org_id as string | undefined;

	const supabaseAdmin = createAdminClient();
	const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
		email,
		password,
		user_metadata: { full_name: name },
		app_metadata: { role, ...(orgId ? { org_id: orgId } : {}) },
		email_confirm: true,
	});

	if (error) throw Object.assign(new Error(error.message), { status: 400 });

	await prisma.user.upsert({
		where: { id: authData.user.id },
		update: { org_id: orgId, role, name },
		create: { id: authData.user.id, email, name, org_id: orgId, role },
	});

	auditLog({
		org_id: orgId,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "CREATE",
		entity_type: "employee",
		entity_id: authData.user.id,
		after: { email, name, role },
	});

	if (orgId) {
		prisma.organization
			.findUnique({ where: { id: orgId }, select: { name: true } })
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

	return {
		id: authData.user.id,
		email: authData.user.email,
		name,
		role,
		created_at: authData.user.created_at,
	};
}

// ─── Get ──────────────────────────────────────────────────────────────────────

export async function getEmployee(id: string, admin: Caller) {
	const supabaseAdmin = createAdminClient();
	const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
	if (error || !data?.user) throw Object.assign(new Error("Employee not found"), { status: 404 });

	const u = data.user;
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const [meta, leaves, tasks, timeEntries] = await Promise.all([
		prisma.userMetaData.findUnique({ where: { user_id: id } }),
		prisma.leave.findMany({ where: { user_id: id }, orderBy: { created_at: "desc" }, take: 10 }),
		prisma.ticket.findMany({ where: { user_id: id }, orderBy: { created_at: "desc" }, take: 10 }),
		prisma.timeEntry.findMany({
			where: { user_id: id, start_time: { gte: thirtyDaysAgo }, end_time: { not: null } },
			orderBy: { start_time: "desc" },
			take: 20,
		}),
	]);

	auditLog({
		org_id: admin.app_metadata?.org_id as string | undefined,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "READ",
		entity_type: "employee",
		entity_id: id,
	});

	const totalTimeMs = timeEntries.reduce((acc, e) => {
		if (!e.end_time) return acc;
		return acc + (e.end_time.getTime() - e.start_time.getTime());
	}, 0);

	return {
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
	};
}

// ─── Update ───────────────────────────────────────────────────────────────────

export type UpdateEmployeeData = {
	name?: string;
	role?: Role;
	phone?: string | null;
	dob?: string | null;
	address?: string | null;
	passport_number?: string | null;
	visa_status?: string | null;
	visa_expiry?: string | null;
	salary?: number | null;
	date_joined?: string | null;
	sick_leave?: number | null;
	vacation_leave?: number | null;
	emergency_leave?: number | null;
	personal_leave?: number | null;
};

export async function updateEmployee(id: string, admin: Caller, data: UpdateEmployeeData) {
	const { name, role, ...rest } = data;
	const supabaseAdmin = createAdminClient();

	const updatePayload: Parameters<typeof supabaseAdmin.auth.admin.updateUserById>[1] = {};
	if (name) updatePayload.user_metadata = { full_name: name };
	if (role) updatePayload.app_metadata = { role };

	if (name || role) {
		const { error } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);
		if (error) throw Object.assign(new Error(error.message), { status: 400 });
	}

	const metaUpdate: Record<string, string | number | Date | null> = {};
	for (const field of META_FIELDS) {
		if (!(field in rest)) continue;
		const value = rest[field as keyof typeof rest];
		if (field === "dob" || field === "visa_expiry" || field === "date_joined") {
			metaUpdate[field] = typeof value === "string" && value ? new Date(value) : null;
		} else {
			metaUpdate[field] = value ?? null;
		}
	}

	if (Object.keys(metaUpdate).length > 0) {
		await prisma.userMetaData.upsert({
			where: { user_id: id },
			update: metaUpdate,
			create: { user_id: id, ...metaUpdate },
		});
	}

	auditLog({
		org_id: admin.app_metadata?.org_id as string | undefined,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "UPDATE",
		entity_type: "employee",
		entity_id: id,
		after: { name, role, ...metaUpdate },
	});

	return { id, name, role };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function getWorkload(admin: Caller) {
	const counts = await prisma.ticket.groupBy({
		by: ["user_id"],
		where: { user_id: { not: null }, status: { not: "completed" } },
		_count: { id: true },
	});
	const workload: Record<string, number> = {};
	for (const row of counts) {
		if (row.user_id) workload[row.user_id] = row._count.id;
	}
	return workload;
}

export async function deleteEmployee(id: string, admin: Caller) {
	if (admin.id === id) throw Object.assign(new Error("Cannot delete your own account"), { status: 400 });

	const supabaseAdmin = createAdminClient();
	const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
	if (error) throw Object.assign(new Error(error.message), { status: 400 });

	auditLog({
		org_id: admin.app_metadata?.org_id as string | undefined,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "DELETE",
		entity_type: "employee",
		entity_id: id,
	});
}
