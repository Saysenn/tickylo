import { prisma } from "@/lib/infra/prisma";
import { OrgsTable } from "@/components/super-admin/orgs-table";

export default async function SuperAdminOrgsPage() {
	const orgs = await prisma.organization.findMany({
		select: {
			id: true,
			name: true,
			plan: true,
			seat_count: true,
			is_internal: true,
			created_at: true,
			_count: { select: { users: true } },
		},
		orderBy: { created_at: "desc" },
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Organizations</h1>
				<p className="text-ink-3 mt-1 text-sm">
					View all registered organizations. Toggle internal access for test accounts.
				</p>
			</div>
			<OrgsTable orgs={orgs} />
		</div>
	);
}
