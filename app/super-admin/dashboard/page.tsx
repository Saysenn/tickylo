import Link from "next/link";
import { prisma } from "@/lib/infra/prisma";
import {
	Building2,
	Users,
	Clock,
	Trash2,
	CheckCircle2,
	TrendingUp,
	AlertTriangle,
	ArrowRight,
	FlaskConical,
} from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const PLAN_COLORS: Record<string, string> = {
	pending:    "text-ink-3 bg-accent",
	unpaid:     "text-amber-600 bg-amber-500/10",
	trial:      "text-blue-600 bg-blue-500/10",
	business:   "text-green-600 bg-green-500/10",
	enterprise: "text-purple-600 bg-purple-500/10",
	cancelled:  "text-red-500 bg-red-500/10",
};

export const metadata = { title: "Super Admin · Dashboard" };

export default async function SuperAdminDashboard() {
	const [
		orgCount,
		pendingApplications,
		pendingDeletions,
		userCount,
		activeOrgs,
		recentOrgs,
		recentDeletions,
	] = await Promise.all([
		prisma.organization.count({ where: { plan: { not: "cancelled" } } }),
		prisma.organizationApplication.count({ where: { status: "pending" } }),
		prisma.orgDeletionRequest.count({ where: { status: "pending" } }),
		prisma.user.count({ where: { org_id: { not: null } } }),
		prisma.organization.count({ where: { plan: { in: ["business", "enterprise"] } } }),
		prisma.organization.findMany({
			where:   { plan: { not: "cancelled" } },
			select:  { id: true, name: true, plan: true, is_internal: true, created_at: true, _count: { select: { users: true } } },
			orderBy: { created_at: "desc" },
			take:    6,
		}),
		prisma.orgDeletionRequest.findMany({
			where:   { status: "pending" },
			include: { org: { select: { name: true, plan: true } } },
			orderBy: { created_at: "desc" },
			take:    3,
		}),
	]);

	const hasAlerts = pendingApplications > 0 || pendingDeletions > 0;

	return (
		<div className="space-y-8">
			{/* Page header */}
			<div>
				<h1 className="text-2xl font-bold text-ink">Dashboard</h1>
				<p className="text-ink-3 mt-0.5 text-sm">Platform-wide overview for Tickworks.</p>
			</div>

			{/* Stats grid */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					icon={Building2}
					label="Active Orgs"
					value={orgCount}
					sub={`${activeOrgs} on paid plan`}
					iconBg="bg-mint/10"
					iconColor="text-mint"
				/>
				<StatCard
					icon={Users}
					label="Total Users"
					value={userCount}
					sub="across all orgs"
					iconBg="bg-info/10"
					iconColor="text-info"
				/>
				<StatCard
					icon={Clock}
					label="Pending Applications"
					value={pendingApplications}
					sub={pendingApplications === 0 ? "all clear" : "need review"}
					iconBg={pendingApplications > 0 ? "bg-warning/10" : "bg-accent"}
					iconColor={pendingApplications > 0 ? "text-warning" : "text-ink-3"}
					alert={pendingApplications > 0}
					href="/super-admin/applications"
				/>
				<StatCard
					icon={Trash2}
					label="Deletion Requests"
					value={pendingDeletions}
					sub={pendingDeletions === 0 ? "all clear" : "need action"}
					iconBg={pendingDeletions > 0 ? "bg-destructive/10" : "bg-accent"}
					iconColor={pendingDeletions > 0 ? "text-destructive" : "text-ink-3"}
					alert={pendingDeletions > 0}
					href="/super-admin/deletion-requests"
				/>
			</div>

			{/* Alert banners */}
			{hasAlerts && (
				<div className="space-y-3">
					{pendingApplications > 0 && (
						<AlertBanner
							icon={Clock}
							color="amber"
							title={`${pendingApplications} company application${pendingApplications !== 1 ? "s" : ""} awaiting review`}
							description="Review and approve or reject company registrations."
							href="/super-admin/applications"
							cta="Review Applications"
						/>
					)}
					{pendingDeletions > 0 && (
						<AlertBanner
							icon={Trash2}
							color="red"
							title={`${pendingDeletions} org deletion request${pendingDeletions !== 1 ? "s" : ""} pending approval`}
							description="Organizations have requested to be deleted. Review before approving."
							href="/super-admin/deletion-requests"
							cta="Review Requests"
						/>
					)}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Recent orgs */}
				<div className="lg:col-span-2 glass rounded-xl overflow-hidden">
					<div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Building2 className="w-4 h-4 text-ink-3" />
							<h2 className="text-sm font-semibold text-ink">Recent Organizations</h2>
						</div>
						<Link
							href="/super-admin/orgs"
							className="text-xs text-ink-3 hover:text-mint flex items-center gap-1 transition-colors"
						>
							View all <ArrowRight className="w-3 h-3" />
						</Link>
					</div>
					{recentOrgs.length === 0 ? (
						<div className="py-12 text-center text-sm text-ink-3">No organizations yet.</div>
					) : (
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-accent/30 border-b border-border/40">
									<th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Name</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Plan</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Users</th>
									<th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ink-3 uppercase tracking-wider">Joined</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/40">
								{recentOrgs.map((org) => (
									<tr key={org.id} className="hover:bg-accent/20 transition-colors">
										<td className="px-4 py-3">
											<div className="flex items-center gap-1.5">
												{org.is_internal && <FlaskConical className="w-3 h-3 text-mint shrink-0" />}
												<span className="font-medium text-ink text-xs">{org.name}</span>
											</div>
										</td>
										<td className="px-4 py-3">
											<span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full capitalize", PLAN_COLORS[org.plan] ?? "text-ink-3 bg-accent")}>
												{org.is_internal ? "internal" : org.plan}
											</span>
										</td>
										<td className="px-4 py-3 text-xs text-ink-3">{org._count.users}</td>
										<td className="px-4 py-3 text-xs text-ink-3">{formatDate(org.created_at.toISOString())}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				{/* Right column: quick actions + pending deletions */}
				<div className="space-y-4">
					{/* Quick nav */}
					<div className="glass rounded-xl p-4 space-y-1">
						<p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider mb-3">Quick Access</p>
						{[
							{ href: "/super-admin/applications",     icon: Clock,      label: "Applications",      badge: pendingApplications > 0 ? pendingApplications : null },
							{ href: "/super-admin/deletion-requests", icon: Trash2,     label: "Deletion Requests", badge: pendingDeletions > 0 ? pendingDeletions : null },
							{ href: "/super-admin/orgs",             icon: Building2,  label: "Organizations",     badge: null },
							{ href: "/super-admin/audit-logs",       icon: TrendingUp, label: "Audit Logs",        badge: null },
						].map(({ href, icon: Icon, label, badge }) => (
							<Link
								key={href}
								href={href}
								className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/60 transition-colors group"
							>
								<div className="flex items-center gap-2.5">
									<Icon className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink transition-colors" />
									<span className="text-sm text-ink-3 group-hover:text-ink transition-colors">{label}</span>
								</div>
								<div className="flex items-center gap-1.5">
									{badge !== null && (
										<span className="text-[10px] font-bold bg-warning/15 text-warning-fg px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
											{badge}
										</span>
									)}
									<ArrowRight className="w-3 h-3 text-ink-3/40 group-hover:text-ink-3 transition-colors" />
								</div>
							</Link>
						))}
					</div>

					{/* Pending deletion requests preview */}
					{recentDeletions.length > 0 && (
						<div className="glass rounded-xl overflow-hidden">
							<div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
								<AlertTriangle className="w-3.5 h-3.5 text-destructive" />
								<h3 className="text-xs font-semibold text-ink">Pending Deletions</h3>
							</div>
							<div className="divide-y divide-border/40">
								{recentDeletions.map((req) => (
									<div key={req.id} className="px-4 py-3">
										<p className="text-xs font-medium text-ink">{req.org.name}</p>
										<div className="flex items-center gap-1.5 mt-0.5">
											<span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize", PLAN_COLORS[req.org.plan] ?? "text-ink-3 bg-accent")}>
												{req.org.plan}
											</span>
											<span className="text-[10px] text-ink-3">{formatDate(req.created_at.toISOString())}</span>
										</div>
									</div>
								))}
							</div>
							<div className="px-4 py-2.5 border-t border-border/40">
								<Link
									href="/super-admin/deletion-requests"
									className="text-xs text-mint hover:underline flex items-center gap-1"
								>
									Review all <ArrowRight className="w-3 h-3" />
								</Link>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function StatCard({
	icon: Icon,
	label,
	value,
	sub,
	iconBg,
	iconColor,
	alert = false,
	href,
}: {
	icon: React.ElementType;
	label: string;
	value: number;
	sub: string;
	iconBg: string;
	iconColor: string;
	alert?: boolean;
	href?: string;
}) {
	const inner = (
		<div className={cn(
			"glass rounded-xl p-5 space-y-3 transition-colors",
			href && "hover:bg-accent/60 cursor-pointer",
			alert && "border-warning/20",
		)}>
			<div className="flex items-center justify-between">
				<div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg)}>
					<Icon className={cn("w-4 h-4", iconColor)} />
				</div>
				{alert && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
				{!alert && value === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-mint/60" />}
			</div>
			<div>
				<p className="text-2xl font-bold text-ink">{value}</p>
				<p className="text-[11px] text-ink-3 mt-0.5">{label}</p>
				<p className="text-[10px] text-ink-3/60 mt-0.5">{sub}</p>
			</div>
		</div>
	);

	if (href) return <Link href={href}>{inner}</Link>;
	return inner;
}

function AlertBanner({
	icon: Icon,
	color,
	title,
	description,
	href,
	cta,
}: {
	icon: React.ElementType;
	color: "amber" | "red";
	title: string;
	description: string;
	href: string;
	cta: string;
}) {
	const colors = {
		amber: {
			border: "border-warning/30",
			bg:     "bg-warning/5",
			icon:   "text-warning",
			title:  "text-warning-fg dark:text-warning",
			cta:    "bg-warning/15 text-warning-fg hover:bg-warning/25 dark:text-warning",
		},
		red: {
			border: "border-destructive/30",
			bg:     "bg-destructive/5",
			icon:   "text-destructive",
			title:  "text-destructive dark:text-destructive/80",
			cta:    "bg-destructive/15 text-destructive hover:bg-destructive/25 dark:text-destructive/80",
		},
	}[color];

	return (
		<div className={cn("rounded-xl border p-4 flex items-center justify-between gap-4", colors.border, colors.bg)}>
			<div className="flex items-start gap-3">
				<Icon className={cn("w-4 h-4 shrink-0 mt-0.5", colors.icon)} />
				<div>
					<p className={cn("text-sm font-semibold", colors.title)}>{title}</p>
					<p className="text-xs text-ink-3 mt-0.5">{description}</p>
				</div>
			</div>
			<Link
				href={href}
				className={cn("shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1", colors.cta)}
			>
				{cta} <ArrowRight className="w-3 h-3" />
			</Link>
		</div>
	);
}
