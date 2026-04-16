"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Send, FileText, Search } from "lucide-react";
import APIService from "@/lib/infra/api";
import { formatInitials, todayDateStr, startOfMonthDateStr } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	SelectRoot,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

interface Employee {
	id: string;
	email: string;
	name: string | null;
	role: string;
}

const AVATAR_COLORS = [
	"bg-mint",
	"bg-green-600",
	"bg-green-700",
	"bg-green-800",
	"bg-emerald-600",
];

export function EmployeeReportsSection() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState("all");
	const [generateDialog, setGenerateDialog] = useState<{
		open: boolean;
		employee: Employee | null;
	}>({ open: false, employee: null });
	const [fromDate, setFromDate] = useState(startOfMonthDateStr());
	const [toDate, setToDate] = useState(todayDateStr());

	const { data, isLoading } = useQuery({
		queryKey: ["employees-list-reports", page],
		queryFn: () => APIService.employees.list(page, 10),
	});

	const employees: Employee[] = (data?.data ?? []).filter(
		(e: Employee) => e.role !== "admin",
	);
	const totalPages: number = data?.totalPages ?? 1;

	const filtered = employees.filter((e) => {
		if (filter === "generated") return false; // no generated reports yet
		if (!search.trim()) return true;
		const q = search.toLowerCase();
		return (
			(e.name ?? "").toLowerCase().includes(q) ||
			e.email.toLowerCase().includes(q)
		);
	});

	return (
		<section className="space-y-3">
			<Card
				className="p-0 gap-0 border border-[rgba(128,237,153,0.18)] backdrop-blur-xl"
				style={{ background: "var(--surface)" }}
			>
				{/* Toolbar */}
				<CardContent className="p-4 border-b border-mint/10">
					<div className="flex flex-wrap items-center gap-3">
						<div className="relative flex-1 min-w-[200px] max-w-xs">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3 pointer-events-none" />
							<Input
								placeholder="Search employees..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 h-8 text-sm"
							/>
						</div>

						<SelectRoot value={filter} onValueChange={setFilter}>
							<SelectTrigger className="w-40 h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All employees</SelectItem>
								<SelectItem value="generated">Report generated</SelectItem>
								<SelectItem value="no_report">No report yet</SelectItem>
							</SelectContent>
						</SelectRoot>

						<span className="text-xs text-ink-3 ml-auto whitespace-nowrap">
							{filtered.length} employee{filtered.length !== 1 ? "s" : ""}
						</span>
					</div>
				</CardContent>

				{/* Table */}
				<CardContent className="p-0">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
						</div>
					) : filtered.length === 0 ? (
						<div className="py-10 text-center text-sm text-ink-3">
							No employees found.
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full min-w-[580px] text-sm">
								<thead>
									<tr className="border-b border-mint/10">
										<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">
											Employee
										</th>
										<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">
											Last Report
										</th>
										<th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border/40">
									{filtered.map((emp, i) => {
										const initials = formatInitials(emp.name, emp.email);
										const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];

										return (
											<tr
												key={emp.id}
												className="hover:bg-mint/5 transition-colors"
											>
												{/* Employee info */}
												<td className="px-4 py-3">
													<div className="flex items-center gap-3">
														<div
															className={cn(
																"w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0",
																colorClass,
															)}
														>
															{initials}
														</div>
														<div className="min-w-0">
															<p className="font-medium text-ink truncate">
																{emp.name ?? "—"}
															</p>
															<p className="text-xs text-ink-3 truncate">
																{emp.email}
															</p>
														</div>
													</div>
												</td>

												{/* Last report badge */}
												<td className="px-4 py-3">
													<Badge
														variant="outline"
														className="text-xs text-ink-3 border-border/40 bg-accent/30"
													>
														No report yet
													</Badge>
												</td>

												{/* Actions */}
												<td className="px-4 py-3">
													<div className="flex items-center justify-end gap-2">
														{/* Generate — opens dialog (UI preview only) */}
														<Button
															size="sm"
															variant="outline"
															className="h-7 text-xs gap-1.5 border-mint/25 hover:border-mint/50 hover:bg-mint/5"
															onClick={() =>
																setGenerateDialog({
																	open: true,
																	employee: emp,
																})
															}
														>
															<FileText className="w-3 h-3" />
															Generate
														</Button>

														{/* View — disabled */}
														<Button
															size="sm"
															variant="ghost"
															className="h-7 text-xs gap-1.5"
															disabled
														>
															<Eye className="w-3 h-3" />
															View
														</Button>

														{/* Send — disabled */}
														<Button
															size="sm"
															variant="ghost"
															className="h-7 w-7 p-0"
															disabled
															title="Send report"
														>
															<Send className="w-3.5 h-3.5" />
														</Button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>

				{/* Pagination */}
				{totalPages > 1 && (
					<CardContent className="p-4 border-t border-mint/10">
						<div className="flex items-center justify-between text-xs text-ink-3">
							<span>
								Page {page} of {totalPages}
							</span>
							<div className="flex gap-1">
								<Button
									size="sm"
									variant="outline"
									className="h-7 px-2.5"
									disabled={page === 1}
									onClick={() => setPage((p) => p - 1)}
								>
									←
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="h-7 px-2.5"
									disabled={page === totalPages}
									onClick={() => setPage((p) => p + 1)}
								>
									→
								</Button>
							</div>
						</div>
					</CardContent>
				)}
			</Card>

			{/* Generate Report Dialog — UI preview, no backend */}
			<DialogRoot
				open={generateDialog.open}
				onOpenChange={(open) =>
					setGenerateDialog((prev) => ({ ...prev, open }))
				}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Generate Report</DialogTitle>
						<DialogDescription>
							For:{" "}
							<span className="font-medium text-ink">
								{generateDialog.employee?.name ??
									generateDialog.employee?.email}
							</span>
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<Label htmlFor="report-from">From</Label>
								<Input
									id="report-from"
									type="date"
									value={fromDate}
									onChange={(e) => setFromDate(e.target.value)}
									className="h-8"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="report-to">To</Label>
								<Input
									id="report-to"
									type="date"
									value={toDate}
									onChange={(e) => setToDate(e.target.value)}
									className="h-8"
								/>
							</div>
						</div>

						<p className="text-xs text-ink-3 bg-accent/40 rounded-lg px-3 py-2 border border-border/40">
							Report generation is coming soon. This feature will compile task
							completion, time logged, and leave data into a shareable report.
						</p>

						<div className="flex justify-end gap-2">
							<Button
								size="sm"
								variant="ghost"
								onClick={() =>
									setGenerateDialog({ open: false, employee: null })
								}
							>
								Cancel
							</Button>
							<Button size="sm" disabled>
								Generate Report
							</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>
		</section>
	);
}
