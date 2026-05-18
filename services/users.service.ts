import { prisma } from "@/lib/infra/prisma";
import type { Caller } from "./ticket.service";

const ALLOWED_FIELDS = ["phone", "address", "passport_number", "visa_status", "visa_expiry", "dob", "bio", "skills", "notes"] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function getUserMeta(caller: Caller) {
	const [meta, userRow] = await Promise.all([
		prisma.userMetaData.findUnique({ where: { user_id: caller.id } }),
		prisma.user.findFirst({
			where: { id: caller.id },
			select: {
				department: { select: { id: true, name: true } },
				managed_departments: { select: { id: true, name: true }, take: 1 },
			},
		}),
	]);
	const department = userRow?.department ?? userRow?.managed_departments?.[0] ?? null;
	const is_department_manager = !!(userRow?.managed_departments?.[0]);
	return meta ? { ...meta, department, is_department_manager } : { department, is_department_manager };
}

export async function updateUserMeta(caller: Caller, body: Record<string, unknown>) {
	const data: Record<string, string | Date | null> = {};
	for (const field of ALLOWED_FIELDS) {
		if (!(field in body)) continue;
		const value = body[field as AllowedField] as string | undefined;
		if (field === "dob" || field === "visa_expiry") {
			data[field] = value ? new Date(value) : null;
		} else {
			data[field] = value === "" ? null : (value ?? null);
		}
	}

	return prisma.userMetaData.upsert({
		where: { user_id: caller.id },
		update: data,
		create: { user_id: caller.id, ...data },
	});
}
