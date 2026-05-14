"use client";

import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { formatDurationMs } from "@/lib/utils/format";
import { Pagination } from "@/components/ui/pagination";

export interface EmployeeStat {
	id: string;
	name: string | null;
	email: string;
	totalMs: number;
	daysWorked: number;
}

interface Props {
	employees: EmployeeStat[];
	onSelect: (id: string, name: string) => void;
	currentUserId?: string;
	search?: string;
	onSearchChange?: (value: string) => void;
}

const PAGE_SIZE = 10;

export function TimeEmployeeTable({ employees, onSelect, currentUserId, search = "", onSearchChange }: Props) {
	const [page, setPage] = useState(1);
	useEffect(() => { setPage(1); }, [search]);

	const filtered = employees.filter((e) => {
		if (!search.trim()) return true;
		const q = search.toLowerCase();
		return (
			(e.name ?? "").toLowerCase().includes(q) ||
			e.email.toLowerCase().includes(q)
		);
	});

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const paginated = filtered.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE,
	);

	return (
		<div className="space-y-3">

			<div className="rounded-lg border overflow-x-auto">
				<table className="w-full text-sm min-w-[480px]">
					<thead>
						<tr className="border-b bg-accent/30">
							<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
								Employee
							</th>
							<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
								Total Hours
							</th>
							<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">
								Days Worked
							</th>
							<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">
								Avg / Day
							</th>
							<th className="w-8" />
						</tr>
					</thead>
					<tbody className="divide-y">
						{paginated.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-8 text-center text-xs text-ink-3">
									No employees found.
								</td>
							</tr>
						) : (
							paginated.map((emp) => (
								<tr
									key={emp.id}
									className="hover:bg-accent/20 cursor-pointer transition-colors"
									onClick={() => onSelect(emp.id, emp.name ?? emp.email)}
								>
									<td className="px-4 py-2">
										<p className="text-xs font-medium text-ink">
											{emp.name ?? "—"}
											{emp.id === currentUserId && (
												<span className="ml-1.5 text-[10px] font-normal text-ink-3">(You)</span>
											)}
										</p>
										<p className="text-xs text-ink-3">{emp.email}</p>
									</td>
									<td className="px-4 py-2 text-right font-mono tabular-nums">
										<span className={emp.totalMs === 0 ? "text-ink-3" : "text-ink font-medium"}>
											{formatDurationMs(emp.totalMs)}
										</span>
									</td>
									<td className="px-4 py-2 text-right text-ink-3 hidden sm:table-cell">
										{emp.daysWorked}
									</td>
									<td className="px-4 py-2 text-right text-ink-3 hidden sm:table-cell">
										{formatDurationMs(emp.daysWorked > 0 ? Math.round(emp.totalMs / emp.daysWorked) : 0)}
									</td>
									<td className="px-4 py-2 text-ink-3">
										<ChevronRight className="w-4 h-4" />
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			<Pagination
				page={currentPage}
				totalPages={totalPages}
				onPrev={() => setPage((p) => p - 1)}
				onNext={() => setPage((p) => p + 1)}
				onGoTo={setPage}
			/>
		</div>
	);
}
