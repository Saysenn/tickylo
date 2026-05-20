import { prisma } from "@/lib/infra/prisma";
import { OrgsTable } from "@/components/super-admin/orgs-table";

export const metadata = { title: "Super Admin · Organizations" };

export default async function SuperAdminOrgsPage() {
	const [orgs, counts] = await Promise.all([
		prisma.organization.findMany({
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
		}),
		prisma.organization.groupBy({
			by: ["plan"],
			_count: { id: true },
		}),
	]);

	const planSummary = counts.reduce<Record<string, number>>((acc, c) => {
		acc[c.plan] = c._count.id;
		return acc;
	}, {});

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold text-ink">Organizations</h1>
					<p className="text-ink-3 mt-1 text-sm">
						All registered organizations. Toggle internal access for test accounts.
					</p>
				</div>
				<div className="flex gap-2 flex-wrap justify-end">
					{[
						{ key: "trial",      label: "Trial",      color: "text-blue-600 bg-blue-500/10" },
						{ key: "business",   label: "Business",   color: "text-green-600 bg-green-500/10" },
						{ key: "enterprise", label: "Enterprise", color: "text-purple-600 bg-purple-500/10" },
					].map(({ key, label, color }) => planSummary[key] ? (
						<span key={key} className={`text-xs font-medium px-2.5 py-1 rounded-full ${color}`}>
							{planSummary[key]} {label}
						</span>
					) : null)}
				</div>
			</div>
			<OrgsTable orgs={orgs} />
		</div>
	);
}
