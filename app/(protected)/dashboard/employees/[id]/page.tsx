import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/infra/prisma";
import { ROLES } from "@/configs/rbac.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatInitials, formatDate, formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmployeeMetaEditSection } from "@/components/dashboard/employees/employee-meta-edit-section";
import { EmployeeLeaveBalanceSection } from "@/components/dashboard/employees/employee-leave-balance-section";

export const metadata = { title: "Employee Details" };

const STATUS_STYLES: Record<string, string> = {
	pending: "bg-accent text-ink-3 border-border/40",
	assigned: "bg-blue-500/15 text-blue-700 border-blue-500/20",
	in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	completed: "bg-green-500/15 text-green-700 border-green-500/20",
};

const LEAVE_STATUS_STYLES: Record<string, string> = {
	pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	approved: "bg-green-500/15 text-green-700 border-green-500/20",
	rejected: "bg-red-500/15 text-red-700 border-red-500/20",
	cancelled: "bg-accent text-ink-3 border-border/40",
};

export default async function EmployeeDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const admin = await requireAdmin();
	if (!admin) redirect("/dashboard");

	const { id } = await params;

	// Fetch auth user
	const supabaseAdmin = createAdminClient();
	const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
	if (error || !data?.user) notFound();

	const u = data.user;

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// Fetch all related data in parallel
	const [meta, leaves, tasks, timeEntries] = await Promise.all([
		prisma.userMetaData.findUnique({ where: { user_id: id } }),
		prisma.leave.findMany({
			where: { user_id: id },
			orderBy: { created_at: "desc" },
			take: 10,
		}),
		prisma.ticket.findMany({
			where: { user_id: id },
			orderBy: { created_at: "desc" },
			take: 10,
		}),
		prisma.timeEntry.findMany({
			where: {
				user_id: id,
				start_time: { gte: thirtyDaysAgo },
				end_time: { not: null },
			},
			orderBy: { start_time: "desc" },
			take: 20,
		}),
	]);

	const totalTimeMs = timeEntries.reduce((acc, entry) => {
		if (!entry.end_time) return acc;
		return acc + (entry.end_time.getTime() - entry.start_time.getTime());
	}, 0);

	const name =
		(u.user_metadata?.full_name ?? u.user_metadata?.name ?? null) as
			| string
			| null;
	const email = u.email ?? "";
	const avatar_url = (u.user_metadata?.avatar_url ?? null) as string | null;
	const role = (u.app_metadata?.role ?? ROLES.EMPLOYEE) as string;

	return (
		<div className="w-full space-y-6">
			{/* Back link */}
			<Link
				href="/dashboard/employees"
				className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors"
			>
				<ArrowLeft className="w-4 h-4" />
				Back to employees
			</Link>

			{/* Profile card */}
			<div className="rounded-lg border bg-background p-6 flex items-start gap-5">
				<Avatar className="w-16 h-16 shrink-0">
					<AvatarImage src={avatar_url ?? undefined} />
					<AvatarFallback className="text-xl bg-mint/15 text-ink-2">
						{formatInitials(name, email)}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-xl font-bold text-ink">{name ?? "—"}</h1>
						<Badge
							variant="outline"
							className={cn(
								"capitalize",
								role === "admin"
									? "bg-mint/15 text-ink-2 border-mint/20"
									: "bg-accent text-ink-3 border-border/40",
							)}
						>
							{role}
						</Badge>
					</div>
					<p className="text-sm text-ink-3 mt-0.5">{email}</p>
					<p className="text-xs text-ink-3 mt-1">
						Joined {formatDate(u.created_at)} · Last seen{" "}
						{formatDate(u.last_sign_in_at ?? null)}
					</p>
				</div>
			</div>

			{/* Metadata — editable by admin */}
			<EmployeeMetaEditSection
				employeeId={id}
				initialMeta={
					meta
						? {
								phone: meta.phone,
								dob: meta.dob?.toISOString() ?? null,
								address: meta.address,
								passport_number: meta.passport_number,
								visa_status: meta.visa_status,
								visa_expiry: meta.visa_expiry?.toISOString() ?? null,
								salary: meta.salary,
								date_joined: meta.date_joined?.toISOString() ?? null,
								sick_leave: meta.sick_leave,
								vacation_leave: meta.vacation_leave,
								emergency_leave: meta.emergency_leave,
								personal_leave: meta.personal_leave,
							}
						: null
				}
			/>

			{/* Tasks */}
			<section className="rounded-lg border bg-background p-6 space-y-4">
				<h2 className="font-semibold text-ink">Tasks</h2>
				{tasks.length > 0 ? (
					<div className="rounded-md border overflow-x-auto">
						<table className="w-full text-sm min-w-[400px]">
							<thead>
								<tr className="border-b bg-accent/30">
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Title</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Status</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Due</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{tasks.map((task) => (
									<tr key={task.id} className="hover:bg-accent/10">
										<td className="px-4 py-2 font-medium text-ink">{task.title}</td>
										<td className="px-4 py-2">
											<Badge
												variant="outline"
												className={cn(STATUS_STYLES[task.status])}
											>
												{task.status.replace("_", " ")}
											</Badge>
										</td>
										<td className="px-4 py-2 text-ink-3">
											{task.due_date ? formatDate(task.due_date.toISOString()) : "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-sm text-ink-3">No tasks assigned.</p>
				)}
			</section>

			{/* Time summary */}
			<section className="rounded-lg border bg-background p-6 space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-ink">Time <span className="font-normal text-ink-3">(last 30 days)</span></h2>
					<span className="text-sm text-ink-3">
						Total: {formatDuration(totalTimeMs)}
					</span>
				</div>
				{timeEntries.length > 0 ? (
					<div className="rounded-md border overflow-x-auto">
						<table className="w-full text-sm min-w-[400px]">
							<thead>
								<tr className="border-b bg-accent/30">
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Date</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Title</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Duration</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{timeEntries.map((entry) => {
									const ms = entry.end_time
										? entry.end_time.getTime() - entry.start_time.getTime()
										: 0;
									return (
										<tr key={entry.id} className="hover:bg-accent/10">
											<td className="px-4 py-2 text-ink-3">
												{formatDate(entry.start_time.toISOString())}
											</td>
											<td className="px-4 py-2 text-ink">
												{entry.title ?? <span className="text-ink-3">—</span>}
											</td>
											<td className="px-4 py-2 text-ink-3">
												{formatDuration(ms)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-sm text-ink-3">No time entries in the last 30 days.</p>
				)}
			</section>
		</div>
	);
}
