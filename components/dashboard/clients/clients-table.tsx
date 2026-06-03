"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientFormDialog, type ClientFormData } from "./client-form-dialog";
import { Briefcase, Pencil, Trash2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

interface Client {
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	currency: string;
	rate_type: string;
	hourly_rate: number;
	discount_percent: number;
	billing_cycle: string;
	payment_terms: string;
	notes: string | null;
	deleted_at: string | null;
	created_at: string;
	_count: { tickets: number };
}

interface ClientsResponse {
	data: Client[];
}

export function ClientsTable() {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["clients"] });

	const { data, isLoading, isError } = useQuery<ClientsResponse>({
		queryKey: ["clients"],
		queryFn: () => APIService.clients.list(),
	});

	const { mutateAsync: createClient, isPending: isCreating } = useMutation({
		mutationFn: (d: ClientFormData) => APIService.clients.create(d),
		onSuccess: invalidate,
	});

	const { mutateAsync: updateClient, isPending: isUpdating } = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ClientFormData }) =>
			APIService.clients.update(id, data),
		onSuccess: invalidate,
	});

	const { mutateAsync: removeClient, isPending: isRemoving } = useMutation({
		mutationFn: (id: string) => APIService.clients.remove(id),
		onSuccess: invalidate,
	});

	if (isLoading) {
		return <TablePageSkeleton />;
	}

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<p className="text-sm text-ink-3">Failed to load clients. Please try again.</p>
			</div>
		);
	}

	const list = data?.data ?? [];

	const handleDelete = async (client: Client) => {
		if (!window.confirm(`Deactivate client "${client.name}"? They will still appear in past invoices.`)) return;
		await removeClient(client.id);
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-ink-3">{list.length} {list.length === 1 ? "client" : "clients"}</p>
				<ClientFormDialog
					mode="create"
					isPending={isCreating}
					onSubmit={async (d) => { await createClient(d); }}
					trigger={
						<Button size="sm">
							<UserPlus className="w-4 h-4" />
							Add Client
						</Button>
					}
				/>
			</div>

			{/* Empty state */}
			{list.length === 0 && (
				<div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg">
					<div className="w-12 h-12 rounded-xl bg-mint/15 flex items-center justify-center mb-4">
						<Briefcase className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">No clients yet</h3>
					<p className="text-sm text-ink-3 max-w-xs">
						Add your first client to start tracking billing rates and generating invoices.
					</p>
				</div>
			)}

			{/* Table */}
			{list.length > 0 && (
				<div className="rounded-lg border overflow-x-auto">
					<table className="w-full min-w-[640px] text-sm">
						<thead>
							<tr className="border-b bg-accent/30">
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Name</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Contact</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Rate</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Discount</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Tickets</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Status</th>
								<th className="px-4 py-2" />
							</tr>
						</thead>
						<tbody className="divide-y">
							{list.map((client) => (
								<tr key={client.id} className={cn("hover:bg-accent/20 transition-colors", client.deleted_at && "opacity-60")}>
									<td className="px-4 py-3">
										<div>
											<p className="text-xs font-medium text-ink">{client.name}</p>
											{client.notes && (
												<p className="text-[11px] text-ink-3 truncate max-w-[180px]">{client.notes}</p>
											)}
										</div>
									</td>
									<td className="px-4 py-3 hidden md:table-cell">
										<p className="text-xs text-ink-3">{client.email ?? "—"}</p>
										{client.phone && <p className="text-[11px] text-ink-3/60">{client.phone}</p>}
									</td>
									<td className="px-4 py-3 text-xs text-ink-2 font-medium">
										{client.rate_type === "none"
											? <span className="text-ink-3">—</span>
											: (() => {
												const suffix = client.rate_type === "hourly"
													? "/hr"
													: client.billing_cycle === "monthly"     ? "/mo"
													: client.billing_cycle === "per_project" ? "/project"
													: "/ticket";
												return `${client.currency} ${client.hourly_rate.toFixed(2)}${suffix}`;
											})()
										}
									</td>
									<td className="px-4 py-3 text-xs text-ink-3 hidden sm:table-cell">
										{client.discount_percent > 0 ? `${client.discount_percent}%` : "—"}
									</td>
									<td className="px-4 py-3 text-xs text-ink-3 hidden sm:table-cell">
										{client._count.tickets}
									</td>
									<td className="px-4 py-3">
										{client.deleted_at ? (
											<Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 border-amber-500/20">
												Deactivated
											</Badge>
										) : (
											<Badge variant="outline" className="text-[11px] bg-green-500/10 text-green-600 border-green-500/20">
												Active
											</Badge>
										)}
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1">
											<ClientFormDialog
												mode="edit"
												client={client}
												isPending={isUpdating}
												onSubmit={async (d) => { await updateClient({ id: client.id, data: d }); }}
												trigger={
													<Button variant="ghost" size="icon-sm" title="Edit">
														<Pencil className="w-3.5 h-3.5" />
													</Button>
												}
											/>
											{!client.deleted_at && (
												<Button
													variant="ghost"
													size="icon-sm"
													title="Deactivate"
													className="text-destructive hover:text-destructive"
													disabled={isRemoving}
													onClick={() => handleDelete(client)}
												>
													<Trash2 className="w-3.5 h-3.5" />
												</Button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
