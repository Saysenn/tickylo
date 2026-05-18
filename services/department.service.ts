import { prisma } from "@/lib/infra/prisma";
import { withOrg } from "@/lib/utils/org-filter";
import { auditLog } from "@/lib/utils/audit";
import { createNotification } from "@/lib/utils/create-notification";
import { ROLES } from "@/configs/rbac.config";
import type { Caller } from "./ticket.service";

export type DepartmentRow = {
	id: string;
	name: string;
	manager_id: string | null;
	manager: { id: string; name: string | null; email: string } | null;
	_count: { users: number };
	created_at: Date;
	updated_at: Date;
};

export async function listDepartments(caller: Caller, page = 1, limit = 50) {
	const orgId = caller.app_metadata?.org_id as string | undefined;
	const take = Math.min(200, Math.max(1, limit));
	const skip = (Math.max(1, page) - 1) * take;

	const [departments, total] = await Promise.all([
		prisma.department.findMany({
			where: withOrg(orgId),
			include: {
				manager: { select: { id: true, name: true, email: true } },
				_count: { select: { users: true } },
			},
			orderBy: { name: "asc" },
			take,
			skip,
		}),
		prisma.department.count({ where: withOrg(orgId) }),
	]);

	return { data: departments as DepartmentRow[], page, totalPages: Math.ceil(total / take) || 1 };
}

export async function createDepartment(admin: Caller, data: { name: string; manager_id?: string | null }) {
	const orgId = admin.app_metadata?.org_id as string | undefined;
	const { name, manager_id } = data;

	const existing = await prisma.department.findFirst({ where: withOrg(orgId, { name }) });
	if (existing) throw Object.assign(new Error("Department already exists"), { status: 400 });

	if (manager_id) {
		const manager = await prisma.user.findFirst({ where: withOrg(orgId, { id: manager_id }) });
		if (!manager) throw Object.assign(new Error("Manager not found in this organization"), { status: 400 });
	}

	const department = await prisma.department.create({
		data: { name, org_id: orgId, manager_id: manager_id ?? null },
		include: {
			manager: { select: { id: true, name: true, email: true } },
			_count: { select: { users: true } },
		},
	});

	if (manager_id) {
		createNotification({
			user_id: manager_id,
			org_id: orgId,
			type: "department_manager",
			title: "You're now a department manager",
			body: `You have been assigned as the manager of the ${name} department.`,
			link: "/dashboard/settings/profile",
		}).catch(() => {});
	}

	auditLog({
		org_id: orgId,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "CREATE",
		entity_type: "department",
		entity_id: department.id,
		after: { name, manager_id },
	});

	return department;
}

export async function updateDepartment(id: string, admin: Caller, data: { name?: string; manager_id?: string | null }) {
	const orgId = admin.app_metadata?.org_id as string | undefined;

	const department = await prisma.department.findFirst({ where: withOrg(orgId, { id }) });
	if (!department) throw Object.assign(new Error("Department not found"), { status: 404 });

	if (data.manager_id) {
		const manager = await prisma.user.findFirst({ where: withOrg(orgId, { id: data.manager_id }) });
		if (!manager) throw Object.assign(new Error("Manager not found in this organization"), { status: 400 });
	}

	const updated = await prisma.department.update({
		where: { id },
		data,
		include: {
			manager: { select: { id: true, name: true, email: true } },
			_count: { select: { users: true } },
		},
	});

	const newManagerId = data.manager_id;
	if (newManagerId && newManagerId !== department.manager_id) {
		createNotification({
			user_id: newManagerId,
			org_id: orgId,
			type: "department_manager",
			title: "You're now a department manager",
			body: `You have been assigned as the manager of the ${updated.name} department.`,
			link: "/dashboard/settings/profile",
		}).catch(() => {});
	}

	auditLog({
		org_id: orgId,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "UPDATE",
		entity_type: "department",
		entity_id: id,
		before: { name: department.name },
		after: data,
	});

	return updated;
}

export async function deleteDepartment(id: string, admin: Caller, force = false) {
	const orgId = admin.app_metadata?.org_id as string | undefined;

	const department = await prisma.department.findFirst({
		where: withOrg(orgId, { id }),
		include: { _count: { select: { users: true } } },
	});
	if (!department) throw Object.assign(new Error("Department not found"), { status: 404 });

	if (department._count.users > 0 && !force) {
		return { hasEmployees: true, count: department._count.users };
	}

	if (force && department._count.users > 0) {
		await prisma.user.updateMany({
			where: { ...withOrg(orgId), department_id: id },
			data: { department_id: null },
		});
	}

	await prisma.department.delete({ where: { id } });

	auditLog({
		org_id: orgId,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "DELETE",
		entity_type: "department",
		entity_id: id,
		before: { name: department.name },
	});

	return { success: true };
}

export async function bulkDeleteDepartments(ids: string[], admin: Caller, force = false) {
	const succeeded: string[] = [];
	const failed: string[] = [];

	for (const id of ids) {
		try {
			const result = await deleteDepartment(id, admin, force);
			if ("hasEmployees" in result) {
				failed.push(id);
			} else {
				succeeded.push(id);
			}
		} catch {
			failed.push(id);
		}
	}

	return { succeeded, failed };
}
