"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CreditCard, Users, Shield, Zap, ExternalLink, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import APIService from "@/lib/infra/api";
import { DowngradeDialog } from "./downgrade-dialog";

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
	trial:      "text-warning-fg bg-warning/10 border-warning/20",
	business:   "text-info-fg bg-info/10 border-info/20",
	enterprise: "text-purple-600 bg-purple-500/10 border-purple-500/20",
	internal:   "text-mint bg-mint/10 border-mint/20",
};

const ENTERPRISE_MIN_SEATS = 26;

export default function SubscriptionPanel({
	org,
	activeUsers,
	hasStripeCustomer,
	hasStripeSubscription,
}: {
	org: OrgBillingInfo;
	activeUsers: number;
	hasStripeCustomer: boolean;
	hasStripeSubscription: boolean;
}) {
	const router = useRouter();
	const plan   = org.is_internal ? "internal" : org.plan;

	const [seatCount, setSeatCount]       = useState(org.seat_count);
	const [seatError, setSeatError]       = useState<string | null>(null);
	const [portalError, setPortalError]   = useState<string | null>(null);
	const [upgradeError, setUpgradeError] = useState<string | null>(null);
	const [showDowngrade, setShowDowngrade] = useState(false);

	// Employees excluding admin (used as minimum for seat management)
	const nonAdminActive = Math.max(0, activeUsers - 1);

	const { mutate: openPortal, isPending: openingPortal } = useMutation({
		mutationFn: () => APIService.billing.portal(),
		onSuccess:  (res: any) => { window.location.href = res.data.url; },
		onError:    (err: any) => {
			setPortalError(err?.response?.data?.error ?? "Failed to open billing portal. Please try again.");
		},
	});

	const { mutate: updateSeats, isPending: updatingSeats } = useMutation({
		mutationFn: (count: number) => APIService.billing.updateSeats(count),
		onSuccess:  () => { setSeatError(null); router.refresh(); },
		onError:    (err: any) => {
			setSeatError(err?.response?.data?.error ?? "Failed to update seats.");
		},
	});

	const { mutate: doUpgrade, isPending: upgrading } = useMutation({
		mutationFn: () => APIService.billing.upgrade(),
		onSuccess:  () => { setUpgradeError(null); router.refresh(); },
		onError:    (err: any) => {
			setUpgradeError(err?.response?.data?.error ?? "Upgrade failed. Please try again.");
		},
	});

	const isOnBusiness    = plan === "business" || plan === "trial";
	const isOnEnterprise  = plan === "enterprise";
	const canChangePlan   = hasStripeSubscription && !org.is_internal;

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
									<p className="text-xs text-warning-fg mt-0.5">
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
								{isOnEnterprise && (
									<span className="text-xs text-ink-3">26 seats minimum</span>
								)}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Seat Management */}
			{!org.is_internal && canChangePlan && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-ink-3 uppercase tracking-wider">Manage Seats</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{isOnBusiness ? (
							<>
								<p className="text-xs text-ink-3">
									$3.99/seat/mo · Mid-month changes are prorated automatically.
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
								{seatError && <p className="text-xs text-destructive">{seatError}</p>}
								<p className="text-[11px] text-ink-3">
									Minimum {activeUsers} seat{activeUsers !== 1 ? "s" : ""} (current active employees).
									Remove seats before your next billing date to avoid charges.
								</p>
							</>
						) : (
							<>
								<p className="text-xs text-ink-3">
									26 seats included · Add more at an additional rate.
								</p>
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setSeatCount((c) => Math.max(ENTERPRISE_MIN_SEATS, c - 1))}
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
										disabled={seatCount === org.seat_count || updatingSeats || seatCount < ENTERPRISE_MIN_SEATS}
										onClick={() => updateSeats(seatCount)}
									>
										Save Changes
									</Button>
								</div>
								{seatError && <p className="text-xs text-destructive">{seatError}</p>}
								<p className="text-[11px] text-ink-3">
									Minimum {ENTERPRISE_MIN_SEATS} seats on Enterprise.
								</p>
							</>
						)}
					</CardContent>
				</Card>
			)}

			{/* No subscription message for seat section */}
			{!org.is_internal && !canChangePlan && (plan === "business" || plan === "enterprise") && (
				<Card>
					<CardContent className="pt-4">
						<p className="text-sm text-ink-3">No active subscription found. Complete checkout to manage seats.</p>
					</CardContent>
				</Card>
			)}

			{/* Plan Change */}
			{canChangePlan && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-ink-3 uppercase tracking-wider">Change Plan</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{isOnBusiness && (
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-ink">Upgrade to Enterprise</p>
									<p className="text-xs text-ink-3 mt-0.5">$100/mo · 26 seats included · Full feature access</p>
								</div>
								<Button
									size="sm"
									className="gap-1.5 shrink-0"
									isLoading={upgrading}
									onClick={() => { setUpgradeError(null); doUpgrade(); }}
								>
									<ArrowUpCircle className="w-3.5 h-3.5" />
									Upgrade
								</Button>
							</div>
						)}
						{isOnEnterprise && (
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-ink">Change to Business</p>
									<p className="text-xs text-ink-3 mt-0.5">$20/mo + $3.99/seat · Choose which seats to keep</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									className="gap-1.5 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5 dark:border-destructive/40 dark:hover:bg-destructive/10"
									onClick={() => setShowDowngrade(true)}
								>
									<ArrowDownCircle className="w-3.5 h-3.5" />
									Downgrade
								</Button>
							</div>
						)}
						{upgradeError && <p className="text-xs text-destructive">{upgradeError}</p>}
					</CardContent>
				</Card>
			)}

			{/* Billing Portal */}
			{!org.is_internal && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-ink-3 uppercase tracking-wider">Billing &amp; Invoices</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2.5 text-sm text-ink-3">
								<CreditCard className="w-4 h-4" />
								<span>Update payment method, view invoices, cancel subscription</span>
							</div>
							{hasStripeCustomer ? (
								<Button
									size="sm"
									variant="outline"
									isLoading={openingPortal}
									onClick={() => { setPortalError(null); openPortal(); }}
									className="gap-1.5 shrink-0"
								>
									<ExternalLink className="w-3.5 h-3.5" />
									Manage Billing
								</Button>
							) : (
								<span className="text-xs text-ink-3">No billing account found</span>
							)}
						</div>
						{portalError && <p className="text-xs text-destructive">{portalError}</p>}
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

			{/* Downgrade dialog */}
			<DowngradeDialog
				open={showDowngrade}
				onOpenChange={setShowDowngrade}
				activeCount={nonAdminActive}
				onSuccess={() => router.refresh()}
			/>
		</div>
	);
}
