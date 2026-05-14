import { prisma } from "@/lib/infra/prisma";

export interface AuditParams {
	org_id?: string;
	actor_id: string;
	actor_role: string;
	action:
		| "CREATE"
		| "READ"
		| "UPDATE"
		| "DELETE"
		| "APPROVE"
		| "REJECT"
		| "CLAIM"
		| "COMPLETE"
		| "HOLD"
		| "REOPEN"
		| "TRANSFER";
	entity_type: "ticket" | "employee" | "leave_request" | "time_entry";
	entity_id: string;
	before?: object;
	after?: object;
}

export function auditLog(params: AuditParams): void {
	prisma.auditLog.create({ data: params }).catch(() => {});
}
