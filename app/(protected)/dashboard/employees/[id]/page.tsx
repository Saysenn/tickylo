import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/infra/prisma";
import { ROLES } from "@/configs/rbac.config";
import { EmployeeDetailBody } from "@/components/dashboard/employees/employee-detail-body";

export const metadata = { title: "Employee Details" };

export default async function EmployeeDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const admin = await requireAdmin();
	if (!admin) redirect("/dashboard");

	const { id } = await params;

	const supabaseAdmin = createAdminClient();
	const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
	if (error || !data?.user) notFound();

	const u = data.user;
	const orgId = admin.app_metadata?.org_id as string | undefined;

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const [meta, tasks, taskTotal, taskCompleted, timeEntries, org, userWithDept] =
		await Promise.all([
			prisma.userMetaData.findUnique({ where: { user_id: id } }),
			prisma.ticket.findMany({
				where: { user_id: id },
				orderBy: { created_at: "desc" },
				take: 10,
			}),
			prisma.ticket.count({ where: { user_id: id } }),
			prisma.ticket.count({ where: { user_id: id, status: "completed" } }),
			prisma.timeEntry.findMany({
				where: {
					user_id: id,
					start_time: { gte: thirtyDaysAgo },
					end_time: { not: null },
				},
				orderBy: { start_time: "desc" },
				take: 20,
			}),
			orgId
				? prisma.organization.findUnique({
						where: { id: orgId },
						select: { departments_enabled: true },
					})
				: Promise.resolve(null),
			prisma.user.findFirst({
				where: { id },
				select: {
					department: { select: { id: true, name: true } },
					managed_departments: {
						where: orgId ? { org_id: orgId } : {},
						select: { id: true, name: true },
						take: 1,
					},
				},
			}),
		]);

	const totalTimeMs = timeEntries.reduce((acc, e) => {
		if (!e.end_time) return acc;
		return acc + (e.end_time.getTime() - e.start_time.getTime());
	}, 0);

	const name = (u.user_metadata?.full_name ?? u.user_metadata?.name ?? null) as string | null;
	const email = u.email ?? "";
	const avatarUrl = (u.user_metadata?.avatar_url ?? null) as string | null;
	const role = (u.app_metadata?.role ?? ROLES.EMPLOYEE) as string;

	return (
		<EmployeeDetailBody
			employeeId={id}
			name={name}
			email={email}
			avatarUrl={avatarUrl}
			role={role}
			createdAt={u.created_at}
			lastSignInAt={u.last_sign_in_at ?? null}
			meta={
				meta
					? {
							phone: meta.phone,
							dob: meta.dob?.toISOString() ?? null,
							address: meta.address,
							dateJoined: meta.date_joined?.toISOString() ?? null,
							passportNumber: meta.passport_number,
							visaStatus: meta.visa_status,
							visaExpiry: meta.visa_expiry?.toISOString() ?? null,
							salary: meta.salary,
							sickLeave: meta.sick_leave,
							vacationLeave: meta.vacation_leave,
							emergencyLeave: meta.emergency_leave,
							personalLeave: meta.personal_leave,
							bio: meta.bio,
							skills: meta.skills,
							notes: meta.notes,
						}
					: null
			}
			tasks={tasks.map((t) => ({
				id: t.id,
				title: t.title,
				status: t.status,
				dueDate: t.due_date?.toISOString() ?? null,
				createdAt: t.created_at.toISOString(),
			}))}
			taskTotal={taskTotal}
			taskCompleted={taskCompleted}
			timeEntries={timeEntries.map((e) => ({
				id: e.id,
				startTime: e.start_time.toISOString(),
				endTime: e.end_time?.toISOString() ?? null,
				title: e.title,
				durationMs: e.end_time
					? e.end_time.getTime() - e.start_time.getTime()
					: 0,
			}))}
			totalTimeMs={totalTimeMs}
			department={userWithDept?.department ?? userWithDept?.managed_departments?.[0] ?? null}
			isDepartmentManager={!!(userWithDept?.managed_departments?.[0])}
			departmentsEnabled={org?.departments_enabled ?? false}
		/>
	);
}
