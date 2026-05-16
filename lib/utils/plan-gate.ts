import { NextResponse } from "next/server";
import type { Organization } from "@/lib/generated/prisma";
import { LOCKED_PLANS, type OrgPlan } from "@/configs/stripe.config";

type OrgWithPlan = Pick<Organization, "plan" | "is_internal">;

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

/**
 * API-level plan gate. Returns a 403 response if the org is not on enterprise.
 * Use in enterprise-only API routes.
 */
export function requireEnterprise(org: OrgWithPlan): NextResponse | null {
	if (isEnterprise(org)) return null;
	return NextResponse.json(
		{ error: "This feature requires the Enterprise plan." },
		{ status: 403 },
	);
}

/**
 * API-level access gate. Returns a 403 response if the org is locked.
 */
export function requireActiveOrg(org: OrgWithPlan): NextResponse | null {
	if (hasAccess(org)) return null;
	return NextResponse.json(
		{ error: "Your organization's subscription is inactive. Please visit /billing." },
		{ status: 403 },
	);
}

export function isBillingLocked(plan: OrgPlan, isInternal: boolean): boolean {
	if (isInternal) return false;
	return LOCKED_PLANS.includes(plan as typeof LOCKED_PLANS[number]);
}
