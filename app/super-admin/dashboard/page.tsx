import Link from "next/link";
import { prisma } from "@/lib/infra/prisma";
import { Building2, Users, Clock } from "lucide-react";

export default async function SuperAdminDashboard() {
	const [orgCount, pendingCount, userCount] = await Promise.all([
		prisma.organization.count(),
		prisma.organizationApplication.count({ where: { status: "pending" } }),
		prisma.user.count({ where: { org_id: { not: null } } }),
	]);

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold text-ink">Super Admin Dashboard</h1>
				<p className="text-ink-3 mt-1 text-sm">Platform-wide overview and controls.</p>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<StatCard icon={Building2} label="Organizations" value={orgCount} color="text-mint" />
				<StatCard icon={Clock} label="Pending Applications" value={pendingCount} color="text-yellow-500" />
				<StatCard icon={Users} label="Total Users" value={userCount} color="text-blue-500" />
			</div>

			{pendingCount > 0 && (
				<div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5 flex items-center justify-between">
					<div>
						<p className="text-sm font-semibold text-ink">
							{pendingCount} application{pendingCount !== 1 ? "s" : ""} awaiting review
						</p>
						<p className="text-xs text-ink-3 mt-0.5">Review and approve or reject company registrations.</p>
					</div>
					<Link
						href="/super-admin/applications"
						className="text-xs font-medium bg-yellow-500/15 text-yellow-600 px-3 py-1.5 rounded-lg hover:bg-yellow-500/25 transition-colors"
					>
						Review →
					</Link>
				</div>
			)}

			<div className="flex gap-3">
				<Link
					href="/super-admin/applications"
					className="text-sm font-medium bg-accent hover:bg-accent/80 text-ink px-4 py-2 rounded-lg transition-colors"
				>
					Company Applications
				</Link>
			</div>
		</div>
	);
}

function StatCard({
	icon: Icon,
	label,
	value,
	color,
}: {
	icon: React.ElementType;
	label: string;
	value: number;
	color: string;
}) {
	return (
		<div className="glass rounded-xl p-5">
			<div className="flex items-center gap-2 mb-3">
				<Icon className={`w-4 h-4 ${color}`} />
				<span className="text-xs font-medium text-ink-3 uppercase tracking-wider">{label}</span>
			</div>
			<p className="text-3xl font-bold text-ink">{value}</p>
		</div>
	);
}
