"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { UserX, RotateCcw, Loader2 } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatInitials, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface DeactivatedEmployee {
	id: string;
	email: string;
	name: string | null;
	avatar_url: string | null;
	role: string;
	deleted_at: string;
}

export function DeactivatedEmployeesSection() {
	const queryClient = useQueryClient();
	const router = useRouter();

	const { data: billing } = useQuery<{ seat_count: number; active_count: number }>({
		queryKey: ["billing-status"],
		queryFn: () => APIService.billing.status(),
		staleTime: 60_000,
	});

	const { data, isLoading } = useQuery<{ data: DeactivatedEmployee[] }>({
		queryKey: ["employees-deactivated"],
		queryFn: () => APIService.employees.listDeactivated() as any,
		staleTime: 30_000,
	});

	const { mutate: reactivate, isPending, variables } = useMutation({
		mutationFn: (id: string) => APIService.employees.reactivate(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees-deactivated"] });
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			queryClient.invalidateQueries({ queryKey: ["billing-status"] });
			router.refresh();
		},
	});

	const employees = data?.data ?? [];
	const availableSeats = billing ? billing.seat_count - billing.active_count : 0;

	if (!isLoading && employees.length === 0) return null;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
						<UserX className="w-3.5 h-3.5 text-destructive" />
					</div>
					<div>
						<CardTitle className="text-sm">Deactivated Employees</CardTitle>
						<CardDescription className="text-xs">
							Reactivate employees when a seat becomes available.
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{isLoading ? (
					<div className="flex items-center justify-center py-8 text-ink-3 gap-2">
						<Loader2 className="w-4 h-4 animate-spin" />
						<span className="text-sm">Loading…</span>
					</div>
				) : (
					<>
						{availableSeats > 0 ? (
							<p className="text-xs text-ink-3">
								<span className="font-medium text-mint">
									{availableSeats} seat{availableSeats !== 1 ? "s" : ""} available
								</span>
								{" "}— you can reactivate up to {availableSeats} employee{availableSeats !== 1 ? "s" : ""}.
							</p>
						) : (
							<div className="rounded-lg border border-warning/30 bg-warning/5 dark:bg-warning/10 px-3 py-2">
								<p className="text-xs text-warning-fg dark:text-warning">
									No seats available. Add more seats in{" "}
									<span className="font-medium">Subscription</span> before reactivating.
								</p>
							</div>
						)}

						<div className="rounded-xl border border-border/60 overflow-hidden">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-border/60 bg-accent/40">
										<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Employee</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Role</th>
										<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Deactivated</th>
										<th className="px-4 py-3 text-right text-xs font-semibold text-ink-3 uppercase tracking-wider">Action</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border/40">
									{employees.map((emp) => (
										<tr key={emp.id} className="hover:bg-accent/20 transition-colors">
											<td className="px-4 py-3">
												<div className="flex items-center gap-2.5">
													<Avatar className="w-7 h-7">
														<AvatarImage src={emp.avatar_url ?? undefined} />
														<AvatarFallback className="text-[10px] bg-accent text-ink-3">
															{formatInitials(emp.name, emp.email)}
														</AvatarFallback>
													</Avatar>
													<div>
														<p className={cn("text-sm font-medium", !emp.name && "text-ink-3 italic")}>
															{emp.name ?? "Unnamed"}
														</p>
														<p className="text-xs text-ink-3">{emp.email}</p>
													</div>
												</div>
											</td>
											<td className="px-4 py-3 hidden sm:table-cell">
												<span className="text-xs text-ink-3 capitalize">{emp.role}</span>
											</td>
											<td className="px-4 py-3 hidden md:table-cell">
												<span className="text-xs text-ink-3">{formatDate(emp.deleted_at)}</span>
											</td>
											<td className="px-4 py-3 text-right">
												<Button
													size="sm"
													variant="outline"
													className="h-7 gap-1.5 text-xs text-mint border-mint/30 hover:bg-mint/8"
													disabled={availableSeats <= 0 || isPending}
													isLoading={isPending && variables === emp.id}
													onClick={() => reactivate(emp.id)}
												>
													<RotateCcw className="w-3 h-3" />
													Reactivate
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
