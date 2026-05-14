import { prisma } from "@/lib/infra/prisma";
import type { Caller } from "./ticket.service";

const ALLOWED_FIELDS = ["phone", "address", "passport_number", "visa_status", "visa_expiry", "dob"] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function getUserMeta(caller: Caller) {
	return prisma.userMetaData.findUnique({ where: { user_id: caller.id } }) ?? null;
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
