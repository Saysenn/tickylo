"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import APIService from "@/lib/infra/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

interface Employee {
	id: string;
	name: string | null;
	email: string;
}

function barColor(count: number) {
	if (count === 0) return "#7FED9940";
	if (count <= 3) return "#7FED99B3";
	return "#7FED99";
}

export function WorkloadChart() {
	const { data: employeesResult } = useQuery<{ data: Employee[] }>({
		queryKey: ["employees-list-workload"],
		queryFn: () => APIService.employees.list(1, 50),
	});

	const { data: workload = {}, isLoading } = useQuery<Record<string, number>>({
		queryKey: ["employees-workload"],
		queryFn: () => APIService.employees.workload(),
	});

	const employees = employeesResult?.data ?? [];

	const chartData = employees
		.map((e) => ({
			name: (e.name ?? e.email).split(" ")[0],
			tasks: workload[e.id] ?? 0,
		}))
		.sort((a, b) => b.tasks - a.tasks)
		.slice(0, 10);

	return (
		<Card className="h-full">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<Users className="w-4 h-4 text-ink-3" />
					<CardTitle className="text-sm font-semibold text-ink">Team Workload</CardTitle>
				</div>
				<p className="text-xs text-ink-3">Active tasks per employee</p>
			</CardHeader>
			<CardContent>
				{isLoading || chartData.length === 0 ? (
					<div className="flex items-center justify-center h-32">
						{isLoading ? (
							<div className="w-4 h-4 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
						) : (
							<p className="text-xs text-ink-3">No employees yet.</p>
						)}
					</div>
				) : (
					<ResponsiveContainer width="100%" height={160}>
						<BarChart data={chartData} margin={{ left: 4, right: 4, top: 4, bottom: 4 }}>
							<XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
							<YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={20} />
							<Tooltip
								cursor={{ fill: "hsl(var(--accent) / 0.5)" }}
								contentStyle={{ fontSize: 12, borderRadius: 6 }}
								formatter={(v) => [`${v ?? 0} task${(v ?? 0) !== 1 ? "s" : ""}`, "Active"]}
							/>
							<Bar dataKey="tasks" radius={[4, 4, 0, 0]} maxBarSize={32}>
								{chartData.map((entry, i) => (
									<Cell key={i} fill={barColor(entry.tasks)} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				)}
				<div className="flex items-center gap-3 mt-2 text-[10px] text-ink-3">
					<span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#7FED9940" }} /> 0 tasks</span>
					<span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#7FED99B3" }} /> 1–3 tasks</span>
					<span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#7FED99" }} /> 4+ tasks</span>
				</div>
			</CardContent>
		</Card>
	);
}
