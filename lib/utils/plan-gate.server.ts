import { NextResponse } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { canAccess, hasAccess, isEnterprise, type Feature } from "./plan-gate";
import type { OrgWithPlan } from "./plan-gate";

export type { Feature };

export function requireEnterprise(org: OrgWithPlan): NextResponse | null {
	if (isEnterprise(org)) return null;
	return NextResponse.json(
		{ error: "This feature requires the Enterprise plan." },
		{ status: 403 },
	);
}

export function requireActiveOrg(org: OrgWithPlan): NextResponse | null {
	if (hasAccess(org)) return null;
	return NextResponse.json(
		{ error: "Your organization's subscription is inactive. Please visit /billing." },
		{ status: 403 },
	);
}

export function requireFeature(
	org: { plan: string; is_internal: boolean },
	feature: Feature,
): NextResponse | null {
	if (canAccess(org.plan, org.is_internal, feature)) return null;
	return NextResponse.json(
		{ error: "This feature requires a higher plan." },
		{ status: 403 },
	);
}

export async function getOrgForGate(orgId: string) {
	return prisma.organization.findUnique({
		where: { id: orgId },
		select: { plan: true, is_internal: true },
	});
}
