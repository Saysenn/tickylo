import { prisma } from "@/lib/infra/prisma";
import type { Caller } from "./ticket.service";

export async function listDepartments(caller: Caller, page = 1, limit = 10) {
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

	return prisma.department.create({ data: { name } });
}

export async function updateDepartment(id: string, admin: Caller, data: { name?: string }) {
	const department = await prisma.department.findUnique({ where: { id } });
	if (!department) throw Object.assign(new Error("Department not found"), { status: 404 });

	return prisma.department.update({ where: { id }, data });
}

export async function deleteDepartment(id: string, admin: Caller) {
	const department = await prisma.department.findUnique({ where: { id }, include: { users: true } });
	if (!department) throw Object.assign(new Error("Department not found"), { status: 404 });
	if (department.users.length > 0)
		throw Object.assign(new Error("Cannot delete department with assigned users"), { status: 400 });

	await prisma.department.delete({ where: { id } });
}
