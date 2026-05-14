import { prisma } from "@/lib/infra/prisma";
import { auditLog } from "@/lib/utils/audit";
import { ROLES } from "@/configs/rbac.config";
import type { Caller } from "./ticket.service";

export async function listDepartments(_caller: Caller, page = 1, limit = 10) {
	const take = Math.min(50, Math.max(1, limit));
	const skip = (Math.max(1, page) - 1) * take;

	const [departments, total] = await Promise.all([
		prisma.department.findMany({ orderBy: { name: "asc" }, take, skip }),
		prisma.department.count(),
	]);

	return { data: departments, page, totalPages: Math.ceil(total / take) || 1 };
}

export async function createDepartment(admin: Caller, name: string) {
	const existing = await prisma.department.findFirst({ where: { name } });
	if (existing) throw Object.assign(new Error("Department already exists"), { status: 400 });

	const department = await prisma.department.create({ data: { name } });

	auditLog({
		org_id: admin.app_metadata?.org_id as string | undefined,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "CREATE",
		entity_type: "department",
		entity_id: department.id,
		after: { name },
	});

	return department;
}

export async function updateDepartment(id: string, admin: Caller, data: { name?: string }) {
	const department = await prisma.department.findUnique({ where: { id } });
	if (!department) throw Object.assign(new Error("Department not found"), { status: 404 });

	const updated = await prisma.department.update({ where: { id }, data });

	auditLog({
		org_id: admin.app_metadata?.org_id as string | undefined,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "UPDATE",
		entity_type: "department",
		entity_id: id,
		before: { name: department.name },
		after: { name: updated.name },
	});

	return updated;
}

export async function deleteDepartment(id: string, admin: Caller) {
	const department = await prisma.department.findUnique({ where: { id }, include: { users: true } });
	if (!department) throw Object.assign(new Error("Department not found"), { status: 404 });
	if (department.users.length > 0)
		throw Object.assign(new Error("Cannot delete department with assigned users"), { status: 400 });

	await prisma.department.delete({ where: { id } });

	auditLog({
		org_id: admin.app_metadata?.org_id as string | undefined,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "DELETE",
		entity_type: "department",
		entity_id: id,
		before: { name: department.name },
	});
}
