/**
 * Injects org_id into every Prisma where clause on org-scoped models.
 * Use this in all service functions to prevent cross-org data leaks.
 *
 * Usage: prisma.ticket.findMany({ where: withOrg(orgId, { status: "pending" }) })
 */
export function withOrg(orgId: string | undefined, where?: object) {
	return { org_id: orgId, ...where };
}
