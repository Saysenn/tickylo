"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Building2, FlaskConical } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import APIService from "@/lib/infra/api";

interface Org {
	id: string;
	name: string;
	plan: string;
	seat_count: number;
	is_internal: boolean;
	created_at: Date;
	_count: { users: number };
}

const PLAN_COLORS: Record<string, string> = {
	pending:    "text-ink-3 bg-accent",
	unpaid:     "text-amber-600 bg-amber-500/10",
	trial:      "text-blue-600 bg-blue-500/10",
	business:   "text-green-600 bg-green-500/10",
	enterprise: "text-purple-600 bg-purple-500/10",
	cancelled:  "text-red-500 bg-red-500/10",
};

export function OrgsTable({ orgs }: { orgs: Org[] }) {
	const router = useRouter();
	const [toggling, setToggling] = useState<string | null>(null);

	const { mutate: toggleInternal } = useMutation({
		mutationFn: ({ orgId, is_internal }: { orgId: string; is_internal: boolean }) => {
			setToggling(orgId);
			return APIService.superAdmin.toggleInternal(orgId, is_internal);
		},
		onSettled: () => { setToggling(null); router.refresh(); },
	});

	if (orgs.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<Building2 className="w-8 h-8 text-ink-3/30 mb-3" />
				<p className="text-sm text-ink-3">No organizations yet</p>
			</div>
		);
	}

	return (
		<div className="glass rounded-xl overflow-hidden">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-border/60 bg-accent/40">
						<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Organization</th>
						<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Plan</th>
						<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Members</th>
						<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Created</th>
						<th className="px-4 py-3 text-right text-xs font-semibold text-ink-3 uppercase tracking-wider">Internal Access</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border/40">
					{orgs.map((org) => (
						<tr key={org.id} className="hover:bg-accent/30 transition-colors">
							<td className="px-4 py-3.5">
								<div className="flex items-center gap-2">
									{org.is_internal && (
										<FlaskConical className="w-3.5 h-3.5 text-mint shrink-0" />
									)}
									<p className="font-medium text-ink">{org.name}</p>
								</div>
							</td>
							<td className="px-4 py-3.5">
								<span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", PLAN_COLORS[org.plan] ?? "text-ink-3 bg-accent")}>
									{org.is_internal ? "internal" : org.plan}
								</span>
							</td>
							<td className="px-4 py-3.5">
								<span className="text-ink-3">{org._count.users}</span>
							</td>
							<td className="px-4 py-3.5">
								<span className="text-xs text-ink-3">{formatDate(org.created_at.toISOString())}</span>
							</td>
							<td className="px-4 py-3.5 text-right">
								<button
									type="button"
									disabled={toggling === org.id}
									onClick={() => toggleInternal({ orgId: org.id, is_internal: !org.is_internal })}
									className={cn(
										"relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
										org.is_internal ? "bg-mint" : "bg-border",
										toggling === org.id && "opacity-50 cursor-not-allowed",
									)}
									title={org.is_internal ? "Revoke internal access" : "Grant internal access (bypasses billing)"}
								>
									<span
										className={cn(
											"inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm",
											org.is_internal ? "translate-x-4" : "translate-x-0.5",
										)}
									/>
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
