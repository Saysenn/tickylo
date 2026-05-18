"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import {
	ChevronRight, Pencil, X, Check, Building2, User2, MapPin, Phone,
	Calendar, Clock, Activity, MoreHorizontal,
} from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
	DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import { formatInitials, formatDate, formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
	if (!dateStr) return "Never";
	const diff = Date.now() - new Date(dateStr).getTime();
	const days = Math.floor(diff / 86_400_000);
	const months = Math.floor(days / 30);
	if (months >= 12) return `${Math.floor(months / 12)} year${Math.floor(months / 12) > 1 ? "s" : ""} ago`;
	if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
	if (days > 1) return `${days} days ago`;
	if (days === 1) return "Yesterday";
	return "Today";
}

function hhMM(ms: number): string {
	const h = Math.floor(ms / 3_600_000);
	const m = Math.floor((ms % 3_600_000) / 60_000);
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const TASK_STATUS: Record<string, string> = {
	pending:     "bg-accent text-ink-3 border-border/40",
	assigned:    "bg-blue-500/15 text-blue-600 border-blue-500/20",
	in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	completed:   "bg-green-500/15 text-green-700 border-green-500/20",
	on_hold:     "bg-orange-500/15 text-orange-700 border-orange-500/20",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Meta {
	phone: string | null;
	dob: string | null;
	address: string | null;
	dateJoined: string | null;
	passportNumber: string | null;
	visaStatus: string | null;
	visaExpiry: string | null;
	salary: number | null;
	sickLeave: number | null;
	vacationLeave: number | null;
	emergencyLeave: number | null;
	personalLeave: number | null;
	bio: string | null;
	skills: string | null;
	notes: string | null;
}

interface Task {
	id: string;
	title: string;
	status: string;
	dueDate: string | null;
	createdAt: string;
}

interface TimeEntry {
	id: string;
	startTime: string;
	endTime: string | null;
	title: string | null;
	durationMs: number;
}

export interface EmployeeDetailBodyProps {
	employeeId: string;
	name: string | null;
	email: string;
	avatarUrl: string | null;
	role: string;
	createdAt: string;
	lastSignInAt: string | null;
	meta: Meta | null;
	tasks: Task[];
	taskTotal: number;
	taskCompleted: number;
	timeEntries: TimeEntry[];
	totalTimeMs: number;
	department: { id: string; name: string } | null;
	departmentsEnabled: boolean;
}

type Tab = "overview" | "tasks" | "time-logs" | "activity";

// ── Edit Dialog ───────────────────────────────────────────────────────────────

function EditDialog({
	open,
	onClose,
	employeeId,
	meta,
	department,
	departmentsEnabled,
}: {
	open: boolean;
	onClose: () => void;
	employeeId: string;
	meta: Meta | null;
	department: { id: string; name: string } | null;
	departmentsEnabled: boolean;
}) {
	const router = useRouter();
	const [phone, setPhone] = useState(meta?.phone ?? "");
	const [address, setAddress] = useState(meta?.address ?? "");
	const [dateJoined, setDateJoined] = useState(
		meta?.dateJoined ? meta.dateJoined.slice(0, 10) : "",
	);
	const [bio, setBio] = useState(meta?.bio ?? "");
	const [skills, setSkills] = useState(meta?.skills ?? "");
	const [notes, setNotes] = useState(meta?.notes ?? "");
	const [selectedDeptId, setSelectedDeptId] = useState<string>(
		department?.id ?? "__none__",
	);
	const [error, setError] = useState<string | null>(null);

	const { data: deptData } = useQuery({
		queryKey: ["departments"],
		queryFn: () => APIService.departments.list(),
		enabled: departmentsEnabled && open,
		staleTime: 30_000,
	});

	const deptOptions = [
		{ value: "__none__", label: "None" },
		...(deptData?.data ?? []).map((d: any) => ({ value: d.id, label: d.name })),
	];

	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			APIService.employees.updateMeta(employeeId, {
				phone: phone.trim() || null,
				address: address.trim() || null,
				date_joined: dateJoined || null,
				bio: bio.trim() || null,
				skills: skills.trim() || null,
				notes: notes.trim() || null,
				department_id: selectedDeptId === "__none__" ? null : selectedDeptId,
				// Preserve existing values
				dob: meta?.dob ?? null,
				passport_number: meta?.passportNumber ?? null,
				visa_status: meta?.visaStatus ?? null,
				visa_expiry: meta?.visaExpiry ?? null,
				salary: meta?.salary ?? null,
				sick_leave: meta?.sickLeave ?? null,
				vacation_leave: meta?.vacationLeave ?? null,
				emergency_leave: meta?.emergencyLeave ?? null,
				personal_leave: meta?.personalLeave ?? null,
			}),
		onSuccess: () => {
			setError(null);
			onClose();
			router.refresh();
		},
		onError: () => setError("Failed to save. Please try again."),
	});

	return (
		<DialogRoot open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Employee Details</DialogTitle>
				</DialogHeader>
				<div className="space-y-5 pt-1">
					{/* Profile fields */}
					<div className="space-y-3">
						<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest">Profile</p>
						{departmentsEnabled && (
							<div className="space-y-1.5">
								<Label>Department</Label>
								<Combobox
									options={deptOptions}
									value={selectedDeptId}
									onChange={setSelectedDeptId}
									placeholder="Select department…"
									searchPlaceholder="Search departments…"
								/>
							</div>
						)}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<Label htmlFor="edit-phone">Phone</Label>
								<Input
									id="edit-phone"
									type="tel"
									placeholder="+63 912 345 6789"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-joined">Date Joined</Label>
								<Input
									id="edit-joined"
									type="date"
									value={dateJoined}
									onChange={(e) => setDateJoined(e.target.value)}
								/>
							</div>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="edit-address">Location</Label>
							<Input
								id="edit-address"
								type="text"
								placeholder="City, Country"
								value={address}
								onChange={(e) => setAddress(e.target.value)}
							/>
						</div>
					</div>

					{/* Bio / Skills / Notes */}
					<div className="space-y-3">
						<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest">About</p>
						<div className="space-y-1.5">
							<Label htmlFor="edit-bio">Bio</Label>
							<textarea
								id="edit-bio"
								rows={3}
								placeholder="A short bio about this employee…"
								value={bio}
								onChange={(e) => setBio(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint resize-none"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="edit-skills">Skills</Label>
							<textarea
								id="edit-skills"
								rows={3}
								placeholder="e.g. React, TypeScript, Design (one per line or comma-separated)"
								value={skills}
								onChange={(e) => setSkills(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint resize-none"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="edit-notes">Notes</Label>
							<textarea
								id="edit-notes"
								rows={3}
								placeholder="Internal notes about this employee…"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint resize-none"
							/>
						</div>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}
					<div className="flex justify-end gap-2 pt-1">
						<DialogClose asChild>
							<Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
						</DialogClose>
						<Button
							size="sm"
							className="bg-mint hover:bg-mint/90 text-ink"
							onClick={() => mutate()}
							isLoading={isPending}
						>
							<Check className="w-3.5 h-3.5" />
							Save Changes
						</Button>
					</div>
				</div>
			</DialogContent>
		</DialogRoot>
	);
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmployeeDetailBody({
	employeeId, name, email, avatarUrl, role, createdAt, lastSignInAt,
	meta, tasks, taskTotal, taskCompleted, timeEntries, totalTimeMs,
	department, departmentsEnabled,
}: EmployeeDetailBodyProps) {
	const [activeTab, setActiveTab] = useState<Tab>("overview");
	const [editOpen, setEditOpen] = useState(false);

	const productivity = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0;

	// Derived activity from tasks + time entries
	const activity = useMemo(() => {
		const items: { date: string; text: string }[] = [
			...tasks.slice(0, 3).map((t) => ({
				date: t.createdAt,
				text: `Task assigned: ${t.title}`,
			})),
			...timeEntries.slice(0, 3).map((e) => ({
				date: e.startTime,
				text: `Logged ${formatDuration(e.durationMs)} on: ${e.title ?? "—"}`,
			})),
		];
		return items
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
			.slice(0, 5);
	}, [tasks, timeEntries]);

	const tabs: { key: Tab; label: string }[] = [
		{ key: "overview", label: "Overview" },
		{ key: "tasks", label: "Tasks" },
		{ key: "time-logs", label: "Time Logs" },
		{ key: "activity", label: "Activity" },
	];

	const aboutFields = [
		{ icon: Building2, label: "Department", value: department?.name ?? "—" },
		{ icon: User2,     label: "Role",       value: null, badge: role },
		{ icon: MapPin,    label: "Location",   value: meta?.address ?? "—" },
		{ icon: Phone,     label: "Phone",      value: meta?.phone ?? "—" },
		{ icon: Calendar,  label: "Date Joined",value: meta?.dateJoined ? formatDate(meta.dateJoined) : "—" },
	];

	return (
		<div className="space-y-5">
			{/* Breadcrumb + actions */}
			<div className="flex items-center justify-between flex-wrap gap-3">
				<nav className="flex items-center gap-1.5 text-sm">
					<Link href="/dashboard/employees" className="text-ink-3 hover:text-ink transition-colors">
						Employees
					</Link>
					<ChevronRight className="w-3.5 h-3.5 text-ink-3" />
					<span className="text-ink font-medium">{name ?? email}</span>
				</nav>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="gap-1.5"
						onClick={() => setEditOpen(true)}
					>
						<Pencil className="w-3.5 h-3.5" />
						Edit Employee
					</Button>
					<Button size="sm" className="bg-mint hover:bg-mint/90 text-ink gap-1.5">
						<MoreHorizontal className="w-3.5 h-3.5" />
						More Actions
					</Button>
				</div>
			</div>

			{/* Profile banner */}
			<div className="rounded-xl border bg-background p-6 flex items-center gap-5">
				<Avatar className="w-16 h-16 shrink-0">
					<AvatarImage src={avatarUrl ?? undefined} />
					<AvatarFallback className="text-xl bg-mint/15 text-ink-2">
						{formatInitials(name, email)}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-xl font-bold text-ink uppercase">{name ?? "—"}</h1>
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
						Joined {formatDate(createdAt)}
						{lastSignInAt && ` · Last seen ${formatDate(lastSignInAt)}`}
					</p>
				</div>
				<div className="shrink-0 text-right space-y-1">
					<div className="flex items-center gap-1.5 justify-end">
						<span className="w-2 h-2 rounded-full bg-mint" />
						<span className="text-sm font-semibold text-ink">Active</span>
					</div>
					<p className="text-xs text-ink-3">
						{employeeId.slice(0, 8).toUpperCase()}
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b flex gap-6">
				{tabs.map(({ key, label }) => (
					<button
						key={key}
						onClick={() => setActiveTab(key)}
						className={cn(
							"pb-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
							activeTab === key
								? "border-mint text-ink"
								: "border-transparent text-ink-3 hover:text-ink",
						)}
					>
						{label}
					</button>
				))}
			</div>

			{/* Content */}
			{activeTab === "overview" && (
				<div className="flex gap-6 items-start">
					{/* Left column */}
					<div className="flex-1 min-w-0 space-y-4">
						{/* About */}
						<section className="rounded-xl border bg-background p-5">
							<div className="flex items-center justify-between mb-4">
								<h2 className="font-semibold text-ink">About</h2>
								<button
									onClick={() => setEditOpen(true)}
									className="text-ink-3 hover:text-ink transition-colors p-1.5 rounded-lg hover:bg-accent"
								>
									<Pencil className="w-3.5 h-3.5" />
								</button>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
								{/* Left: structured fields */}
								<div className="divide-y divide-border/50">
									{aboutFields.map(({ icon: Icon, label, value, badge }) => (
										<div key={label} className="flex items-center gap-3 py-2.5">
											<Icon className="w-4 h-4 text-ink-3 shrink-0" />
											<span className="text-xs text-ink-3 w-24 shrink-0">{label}</span>
											{badge ? (
												<Badge
													variant="outline"
													className={cn(
														"text-[10px] capitalize",
														role === "admin"
															? "bg-mint/15 text-ink-2 border-mint/20"
															: "bg-accent text-ink-3 border-border/40",
													)}
												>
													{badge}
												</Badge>
											) : (
												<span className="text-xs text-ink truncate">{value}</span>
											)}
										</div>
									))}
								</div>
								{/* Right: bio / skills / notes */}
								<div className="space-y-4 pt-2 sm:pt-0">
									<div>
										<p className="text-xs font-medium text-ink mb-1">Bio</p>
										{meta?.bio ? (
											<p className="text-xs text-ink whitespace-pre-wrap">{meta.bio}</p>
										) : (
											<p className="text-xs text-ink-3">—</p>
										)}
									</div>
									<div>
										<p className="text-xs font-medium text-ink mb-1">Skills</p>
										{meta?.skills ? (
											<div className="flex flex-wrap gap-1.5">
												{meta.skills
													.split(/[\n,]/)
													.map((s) => s.trim())
													.filter(Boolean)
													.map((skill) => (
														<span
															key={skill}
															className="text-[10px] px-2 py-0.5 rounded-full bg-mint/10 text-mint border border-mint/20 font-medium"
														>
															{skill}
														</span>
													))}
											</div>
										) : (
											<p className="text-xs text-ink-3">No skills added yet.</p>
										)}
									</div>
									<div>
										<p className="text-xs font-medium text-ink mb-1">Notes</p>
										{meta?.notes ? (
											<p className="text-xs text-ink whitespace-pre-wrap">{meta.notes}</p>
										) : (
											<p className="text-xs text-ink-3">No notes added yet.</p>
										)}
									</div>
								</div>
							</div>
						</section>

						{/* Tasks */}
						<section className="rounded-xl border bg-background p-5">
							<div className="flex items-center justify-between mb-4">
								<h2 className="font-semibold text-ink">Tasks</h2>
								<Link
									href={`/dashboard/tickets?employee=${employeeId}`}
									className="text-xs text-mint hover:text-mint/80 transition-colors flex items-center gap-1"
								>
									View all tasks
									<ChevronRight className="w-3 h-3" />
								</Link>
							</div>
							{tasks.length > 0 ? (
								<div className="rounded-lg border overflow-x-auto">
									<table className="w-full text-sm min-w-[400px]">
										<thead>
											<tr className="border-b bg-accent/30">
												<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Title</th>
												<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Status</th>
												<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Due Date</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{tasks.map((task) => (
												<tr key={task.id} className="hover:bg-accent/10">
													<td className="px-4 py-2.5 text-xs font-medium text-ink">{task.title}</td>
													<td className="px-4 py-2.5">
														<Badge
															variant="outline"
															className={cn("text-[10px] capitalize", TASK_STATUS[task.status] ?? TASK_STATUS.pending)}
														>
															{task.status.replace(/_/g, " ")}
														</Badge>
													</td>
													<td className="px-4 py-2.5 text-xs text-ink-3">
														{task.dueDate ? formatDate(task.dueDate) : "—"}
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

						{/* Time Log */}
						<section className="rounded-xl border bg-background p-5">
							<div className="flex items-center justify-between mb-4">
								<h2 className="font-semibold text-ink">
									Time Log{" "}
									<span className="font-normal text-ink-3 text-xs">(last 30 days)</span>
								</h2>
								<Link
									href={`/dashboard/time-logs?employee=${employeeId}`}
									className="text-xs text-mint hover:text-mint/80 transition-colors flex items-center gap-1"
								>
									View all time logs
									<ChevronRight className="w-3 h-3" />
								</Link>
							</div>
							{timeEntries.length > 0 ? (
								<>
									<div className="rounded-lg border overflow-x-auto">
										<table className="w-full text-sm min-w-[400px]">
											<thead>
												<tr className="border-b bg-accent/30">
													<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Date</th>
													<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Title</th>
													<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Duration</th>
												</tr>
											</thead>
											<tbody className="divide-y">
												{timeEntries.map((entry) => (
													<tr key={entry.id} className="hover:bg-accent/10">
														<td className="px-4 py-2.5 text-xs text-ink-3">{formatDate(entry.startTime)}</td>
														<td className="px-4 py-2.5 text-xs text-ink">{entry.title ?? <span className="text-ink-3">—</span>}</td>
														<td className="px-4 py-2.5 text-xs text-ink-3">{formatDuration(entry.durationMs)}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
									<div className="flex justify-end mt-2">
										<p className="text-xs text-ink-3">
											Total: <span className="font-semibold text-ink">{formatDuration(totalTimeMs)}</span>
										</p>
									</div>
								</>
							) : (
								<p className="text-sm text-ink-3">No time entries in the last 30 days.</p>
							)}
						</section>

						{/* Recent Activity */}
						<section className="rounded-xl border bg-background p-5">
							<div className="flex items-center justify-between mb-4">
								<h2 className="font-semibold text-ink">Recent Activity</h2>
								<span className="text-xs text-ink-3">Last 30 days</span>
							</div>
							{activity.length > 0 ? (
								<div className="space-y-3">
									{activity.map((item, i) => (
										<div key={i} className="flex gap-3">
											<div className="flex flex-col items-center">
												<span className="w-2 h-2 rounded-full bg-mint mt-1 shrink-0" />
												{i < activity.length - 1 && (
													<span className="w-px flex-1 bg-border/60 mt-1" />
												)}
											</div>
											<div className="pb-3">
												<p className="text-[11px] text-ink-3">
													{formatDate(item.date)}
												</p>
												<p className="text-xs text-ink mt-0.5">{item.text}</p>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-ink-3">No recent activity.</p>
							)}
						</section>
					</div>

					{/* Right sidebar */}
					<div className="w-64 shrink-0 space-y-4">
						{/* Profile Summary */}
						<section className="rounded-xl border bg-background p-5">
							<h3 className="font-semibold text-ink text-sm mb-4">Profile Summary</h3>
							<div className="divide-y divide-border/50">
								{[
									{ label: "Status", value: null, badge: "Active" },
									{ label: "Joined", value: `${formatDate(createdAt)} (${relativeTime(createdAt)})` },
									{ label: "Last Seen", value: lastSignInAt ? `${formatDate(lastSignInAt)} (${relativeTime(lastSignInAt)})` : "—" },
									{ label: "Role", value: role.charAt(0).toUpperCase() + role.slice(1) },
									{ label: "Department", value: department?.name ?? "—" },
									{ label: "Location", value: meta?.address ?? "—" },
									{ label: "Reports To", value: "—" },
								].map(({ label, value, badge }) => (
									<div key={label} className="py-2.5 flex items-start justify-between gap-2">
										<span className="text-[11px] text-ink-3 shrink-0">{label}</span>
										{badge ? (
											<Badge variant="outline" className="text-[10px] bg-mint/10 text-mint border-mint/20">
												{badge}
											</Badge>
										) : (
											<span className="text-[11px] text-ink text-right">{value}</span>
										)}
									</div>
								))}
							</div>
						</section>

						{/* Statistics */}
						<section className="rounded-xl border bg-background p-5">
							<h3 className="font-semibold text-ink text-sm mb-4">Statistics</h3>
							<div className="grid grid-cols-2 gap-3">
								{[
									{ label: "Tasks Assigned", value: taskTotal },
									{ label: "Tasks Completed", value: taskCompleted },
									{ label: "Time Logged", value: hhMM(totalTimeMs) },
									{ label: "Productivity", value: `${productivity}%` },
								].map(({ label, value }) => (
									<div key={label} className="rounded-xl border bg-accent/30 p-3 text-center">
										<p className="text-xl font-bold text-ink">{value}</p>
										<p className="text-[10px] text-ink-3 mt-0.5 leading-tight">{label}</p>
									</div>
								))}
							</div>
						</section>

					</div>
				</div>
			)}

			{/* Tasks tab */}
			{activeTab === "tasks" && (
				<section className="rounded-xl border bg-background p-5">
					<h2 className="font-semibold text-ink mb-4">All Tasks ({taskTotal})</h2>
					{tasks.length > 0 ? (
						<div className="rounded-lg border overflow-x-auto">
							<table className="w-full text-sm min-w-[400px]">
								<thead>
									<tr className="border-b bg-accent/30">
										<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Title</th>
										<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Status</th>
										<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Due Date</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{tasks.map((task) => (
										<tr key={task.id} className="hover:bg-accent/10">
											<td className="px-4 py-2.5 text-xs font-medium text-ink">{task.title}</td>
											<td className="px-4 py-2.5">
												<Badge variant="outline" className={cn("text-[10px] capitalize", TASK_STATUS[task.status] ?? TASK_STATUS.pending)}>
													{task.status.replace(/_/g, " ")}
												</Badge>
											</td>
											<td className="px-4 py-2.5 text-xs text-ink-3">
												{task.dueDate ? formatDate(task.dueDate) : "—"}
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
			)}

			{/* Time Logs tab */}
			{activeTab === "time-logs" && (
				<section className="rounded-xl border bg-background p-5">
					<div className="flex items-center justify-between mb-4">
						<h2 className="font-semibold text-ink">Time Logs <span className="font-normal text-ink-3 text-xs">(last 30 days)</span></h2>
						<p className="text-xs text-ink-3">Total: <span className="font-semibold text-ink">{formatDuration(totalTimeMs)}</span></p>
					</div>
					{timeEntries.length > 0 ? (
						<div className="rounded-lg border overflow-x-auto">
							<table className="w-full text-sm min-w-[400px]">
								<thead>
									<tr className="border-b bg-accent/30">
										<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Date</th>
										<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Title</th>
										<th className="text-left px-4 py-2.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Duration</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{timeEntries.map((entry) => (
										<tr key={entry.id} className="hover:bg-accent/10">
											<td className="px-4 py-2.5 text-xs text-ink-3">{formatDate(entry.startTime)}</td>
											<td className="px-4 py-2.5 text-xs text-ink">{entry.title ?? <span className="text-ink-3">—</span>}</td>
											<td className="px-4 py-2.5 text-xs text-ink-3">{formatDuration(entry.durationMs)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className="text-sm text-ink-3">No time entries in the last 30 days.</p>
					)}
				</section>
			)}

			{/* Activity tab */}
			{activeTab === "activity" && (
				<section className="rounded-xl border bg-background p-5">
					<h2 className="font-semibold text-ink mb-4">Recent Activity</h2>
					{activity.length > 0 ? (
						<div className="space-y-3">
							{activity.map((item, i) => (
								<div key={i} className="flex gap-3">
									<div className="flex flex-col items-center">
										<span className="w-2 h-2 rounded-full bg-mint mt-1 shrink-0" />
										{i < activity.length - 1 && <span className="w-px flex-1 bg-border/60 mt-1" />}
									</div>
									<div className="pb-3">
										<p className="text-[11px] text-ink-3">{formatDate(item.date)}</p>
										<p className="text-xs text-ink mt-0.5">{item.text}</p>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-ink-3">No recent activity.</p>
					)}
				</section>
			)}

			{/* Edit dialog */}
			<EditDialog
				open={editOpen}
				onClose={() => setEditOpen(false)}
				employeeId={employeeId}
				meta={meta}
				department={department}
				departmentsEnabled={departmentsEnabled}
			/>
		</div>
	);
}
