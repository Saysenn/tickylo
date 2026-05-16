"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CreditCard, Users, Calendar, Shield, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import APIService from "@/lib/infra/api";

type OrgBillingInfo = {
	plan: string;
	seat_count: number;
	trial_ends_at: Date | null;
	next_billing_date: Date | null;
	had_trial: boolean;
	is_internal: boolean;
};

const PLAN_LABELS: Record<string, string> = {
	trial:      "Free Trial",
	business:   "Business",
	enterprise: "Enterprise",
	internal:   "Internal (Exempt)",
};

const PLAN_COLORS: Record<string, string> = {
	trial:      "text-amber-600 bg-amber-500/10 border-amber-500/20",
	business:   "text-blue-600 bg-blue-500/10 border-blue-500/20",
	enterprise: "text-purple-600 bg-purple-500/10 border-purple-500/20",
	internal:   "text-mint bg-mint/10 border-mint/20",
};

export default function SubscriptionPanel({
	org,
	activeUsers,
}: {
	org: OrgBillingInfo;
	activeUsers: number;
}) {
	const router  = useRouter();
	const plan    = org.is_internal ? "internal" : org.plan;

	const [seatCount, setSeatCount] = useState(org.seat_count);
	const [seatError, setSeatError] = useState<string | null>(null);

	const { mutate: openPortal, isPending: openingPortal } = useMutation({
		mutationFn: () => APIService.billing.portal(),
		onSuccess: (res: any) => {
			window.location.href = res.data.url;
		},
	});

	const { mutate: updateSeats, isPending: updatingSeats } = useMutation({
		mutationFn: (count: number) => APIService.billing.updateSeats(count),
		onSuccess: () => { setSeatError(null); router.refresh(); },
		onError: (err: any) => {
			setSeatError(err?.response?.data?.error ?? "Failed to update seats");
		},
	});

	return (
		<div className="space-y-6 max-w-2xl">
			<div>
				<h2 className="text-lg font-semibold text-ink">Subscription</h2>
				<p className="text-sm text-ink-3 mt-0.5">Manage your plan, seats, and billing.</p>
			</div>

			{/* Current Plan */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-medium text-ink-3 uppercase tracking-wider">Current Plan</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Zap className="w-5 h-5 text-ink-3" />
							<div>
								<p className="font-semibold text-ink">{PLAN_LABELS[plan] ?? plan}</p>
								{org.trial_ends_at && plan === "trial" && (
									<p className="text-xs text-amber-600 mt-0.5">
										Trial ends {formatDate(org.trial_ends_at.toISOString())} — card charged automatically after
									</p>
								)}
								{org.next_billing_date && plan !== "trial" && (
									<p className="text-xs text-ink-3 mt-0.5">
										Next billing: {formatDate(org.next_billing_date.toISOString())}
									</p>
								)}
							</div>
						</div>
						<span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", PLAN_COLORS[plan] ?? "text-ink-3 bg-accent border-border")}>
							{PLAN_LABELS[plan] ?? plan}
						</span>
					</div>

					{!org.is_internal && (
						<>
							<Separator />
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2.5 text-sm text-ink-3">
									<Users className="w-4 h-4" />
									<span>
										<span className="font-medium text-ink">{activeUsers}</span> of{" "}
										<span className="font-medium text-ink">{org.seat_count}</span> seats used
									</span>
								</div>
								{plan === "enterprise" && (
									<span className="text-xs text-ink-3">25 seats included</span>
								)}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Seat Management (Business only) */}
			{plan === "business" && !org.is_internal && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-ink-3 uppercase tracking-wider">Manage Seats</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-xs text-ink-3">
							$4.99/seat/mo · Mid-month changes are prorated automatically.
						</p>
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setSeatCount((c) => Math.max(activeUsers, c - 1))}
									className="w-8 h-8 rounded border border-border text-ink-3 hover:text-ink hover:bg-accent transition-colors text-lg font-medium"
								>
									−
								</button>
								<span className="w-12 text-center font-semibold text-ink">{seatCount}</span>
								<button
									type="button"
									onClick={() => setSeatCount((c) => Math.min(500, c + 1))}
									className="w-8 h-8 rounded border border-border text-ink-3 hover:text-ink hover:bg-accent transition-colors text-lg font-medium"
								>
									+
								</button>
							</div>
							<Button
								size="sm"
								variant="outline"
								isLoading={updatingSeats}
								disabled={seatCount === org.seat_count || updatingSeats}
								onClick={() => updateSeats(seatCount)}
							>
								Save Changes
							</Button>
						</div>
						{seatError && (
							<p className="text-xs text-red-500">{seatError}</p>
						)}
						<p className="text-[11px] text-ink-3">
							Minimum {activeUsers} seat{activeUsers !== 1 ? "s" : ""} (current active employees).
							Remove seats before your next billing date to avoid charges.
						</p>
					</CardContent>
				</Card>
			)}

			{/* Billing Portal */}
			{!org.is_internal && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-ink-3 uppercase tracking-wider">Billing &amp; Invoices</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5 text-sm text-ink-3">
								<CreditCard className="w-4 h-4" />
								<span>Update payment method, view invoices, cancel subscription</span>
							</div>
							<Button
								size="sm"
								variant="outline"
								isLoading={openingPortal}
								onClick={() => openPortal()}
								className="gap-1.5 shrink-0"
							>
								<ExternalLink className="w-3.5 h-3.5" />
								Manage Billing
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Security notice */}
			<div className="flex items-start gap-2.5 text-xs text-ink-3">
				<Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
				<p>
					All billing is handled securely by Stripe. Your card details never touch our servers.
					{org.is_internal && " This account is exempt from billing."}
				</p>
			</div>
		</div>
	);
}
