import type { Organization } from "@/lib/generated/prisma";
import { LOCKED_PLANS, type OrgPlan } from "@/configs/stripe.config";

export type OrgWithPlan = Pick<Organization, "plan" | "is_internal">;

/**
 * Returns true when the org has full platform access.
 * Internal orgs always pass regardless of plan.
 */
export function hasAccess(org: OrgWithPlan): boolean {
	if (org.is_internal) return true;
	return !LOCKED_PLANS.includes(org.plan as typeof LOCKED_PLANS[number]);
}

/**
 * Returns true when the org is on enterprise or is internal.
 */
export function isEnterprise(org: OrgWithPlan): boolean {
	if (org.is_internal) return true;
	return org.plan === "enterprise";
}

export function isBillingLocked(plan: OrgPlan, isInternal: boolean): boolean {
	if (isInternal) return false;
	return LOCKED_PLANS.includes(plan as typeof LOCKED_PLANS[number]);
}

// ─── Feature-level plan gating ───────────────────────────────────────────────

export type Feature =
	| "dashboard"
	| "employees"
	| "departments"
	| "bulk_operations"
	| "ticket_requests"
	| "ticket_templates"
	| "work_schedule"
	| "attachments"
	| "audit_logs"
	| "time_manager"
	| "reports"
	| "performance"
	| "csv_export"
	| "ai"
	| "sms_ticket"
	| "email_ticket";

const FEATURE_PLANS: Record<Feature, string[]> = {
	dashboard:        ["business", "enterprise"],
	employees:        ["business", "enterprise"],
	departments:      ["business", "enterprise"],
	bulk_operations:  ["business", "enterprise"],
	ticket_requests:  ["business", "enterprise"],
	ticket_templates: ["business", "enterprise"],
	work_schedule:    ["business", "enterprise"],
	attachments:      ["business", "enterprise"],
	audit_logs:       ["business", "enterprise"],
	time_manager:     ["business", "enterprise"],
	reports:          ["enterprise"],
	performance:      ["enterprise"],
	csv_export:       ["enterprise"],
	ai:               ["enterprise"],
	sms_ticket:       ["enterprise"],
	email_ticket:     ["enterprise"],
};

/** trial resolves to business for feature checks */
function effectivePlan(plan: string): string {
	return plan === "trial" ? "business" : plan;
}

export function canAccess(plan: string, isInternal: boolean, feature: Feature): boolean {
	if (isInternal) return true;
	return FEATURE_PLANS[feature].includes(effectivePlan(plan));
}

