"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
	Elements,
	CardElement,
	useStripe,
	useElements,
} from "@stripe/react-stripe-js";
import { useMutation } from "@tanstack/react-query";
import { Building2, Users, CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import APIService from "@/lib/infra/api";

const stripePromise = loadStripe(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

const CARD_ELEMENT_OPTIONS = {
	style: {
		base: {
			fontSize: "14px",
			color: "#1a1a1a",
			"::placeholder": { color: "#9ca3af" },
			fontFamily: "inherit",
		},
	},
};

type Plan = "business" | "enterprise";

interface Props {
	orgName: string;
	hadTrial: boolean;
}

function SetupForm({ orgName, hadTrial }: Props) {
	const stripe  = useStripe();
	const elements = useElements();
	const router  = useRouter();

	const [plan, setPlan]           = useState<Plan>("business");
	const [seatCount, setSeatCount] = useState(5);
	const [error, setError]         = useState<string | null>(null);

	const businessTotal = (20 + seatCount * 4.99).toFixed(2);
	const enterpriseTotal = "100.00";

	const { mutate: setup, isPending } = useMutation({
		mutationFn: async () => {
			if (!stripe || !elements) throw new Error("Stripe not loaded");
			const card = elements.getElement(CardElement);
			if (!card) throw new Error("Card element not found");

			const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
				type: "card",
				card,
			});
			if (pmErr) throw new Error(pmErr.message);
			if (!paymentMethod) throw new Error("Payment method creation failed");

			return APIService.billing.setup({
				plan,
				seat_count:        plan === "business" ? seatCount : 26,
				interval:          "monthly",
				payment_method_id: paymentMethod.id,
			});
		},
		onSuccess: () => router.push("/billing/success"),
		onError: (err: any) => {
			const msg = err?.response?.data?.error ?? err?.message ?? "Setup failed";
			setError(msg);
		},
	});

	return (
		<div className="space-y-6">
			{/* Plan selector */}
			<div className="grid grid-cols-2 gap-3">
				{/* Business */}
				<button
					type="button"
					onClick={() => setPlan("business")}
					className={cn(
						"text-left p-4 rounded-xl border-2 transition-all",
						plan === "business"
							? "border-mint bg-mint/5"
							: "border-border hover:border-border/80 bg-card",
					)}
				>
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<Building2 className="w-4 h-4 text-ink-3" />
							<span className="font-semibold text-ink text-sm">Business</span>
						</div>
						{plan === "business" && <CheckCircle2 className="w-4 h-4 text-mint" />}
					</div>
					<p className="text-xs text-ink-3 leading-relaxed">
						$20/mo base + $4.99/seat/mo
					</p>
					<p className="text-[11px] text-ink-3/70 mt-1">
						Admin included. Each employee = $4.99/seat.
					</p>
				</button>

				{/* Enterprise */}
				<button
					type="button"
					onClick={() => setPlan("enterprise")}
					className={cn(
						"text-left p-4 rounded-xl border-2 transition-all",
						plan === "enterprise"
							? "border-mint bg-mint/5"
							: "border-border hover:border-border/80 bg-card",
					)}
				>
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<Users className="w-4 h-4 text-ink-3" />
							<span className="font-semibold text-ink text-sm">Enterprise</span>
						</div>
						{plan === "enterprise" && <CheckCircle2 className="w-4 h-4 text-mint" />}
					</div>
					<p className="text-xs text-ink-3 leading-relaxed">
						$100/mo flat — 26 seats + admin
					</p>
					<p className="text-[11px] text-ink-3/70 mt-1">
						No per-seat math. Everything the platform has.
					</p>
				</button>
			</div>

			{/* Seat count (Business only) */}
			{plan === "business" && (
				<div className="space-y-2">
					<label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
						Number of seats (employees)
					</label>
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setSeatCount((c) => Math.max(1, c - 1))}
								className="w-8 h-8 rounded border border-border text-ink-3 hover:text-ink hover:bg-accent transition-colors text-lg font-medium"
							>
								−
							</button>
							<span className="w-12 text-center font-semibold text-ink text-base">{seatCount}</span>
							<button
								type="button"
								onClick={() => setSeatCount((c) => Math.min(500, c + 1))}
								className="w-8 h-8 rounded border border-border text-ink-3 hover:text-ink hover:bg-accent transition-colors text-lg font-medium"
							>
								+
							</button>
							<span className="text-sm text-ink-3 ml-1">seat{seatCount !== 1 ? "s" : ""}</span>
						</div>
						<div className="text-right">
							<p className="text-lg font-bold text-ink">${businessTotal}<span className="text-xs font-normal text-ink-3">/mo</span></p>
							<p className="text-[11px] text-ink-3">$20 + {seatCount} × $4.99</p>
						</div>
					</div>
				</div>
			)}

			{/* Features summary for selected plan */}
			<div className="rounded-lg border border-border/60 bg-accent/30 px-4 py-4 space-y-3">
				{plan === "business" ? (
					<>
						<div className="flex items-center justify-between">
							<p className="text-sm font-semibold text-ink">Business — what's included</p>
							<p className="text-base font-bold text-ink">${businessTotal}<span className="text-xs font-normal text-ink-3">/mo</span></p>
						</div>
						<ul className="space-y-1.5">
							{[
								"Full ticketing + task management",
								"Per-ticket time tracking",
								"Departments + bulk operations",
								"Ticket requests + templates",
								"Leave management",
								"File & image attachments",
								"Team overview (time manager)",
								"Audit log + GDPR tools",
								"Work schedule config",
								"Browser extension",
							].map((f) => (
								<li key={f} className="flex items-center gap-2 text-xs text-ink-3">
									<Check className="w-3 h-3 text-mint shrink-0" />
									{f}
								</li>
							))}
							{[
								"Reports & performance analytics",
								"CSV export",
								"AI assistance",
								"SMS → ticket",
								"Email → ticket",
							].map((f) => (
								<li key={f} className="flex items-center gap-2 text-xs text-ink-3/40 line-through">
									<Check className="w-3 h-3 text-ink-3/20 shrink-0" />
									{f}
								</li>
							))}
						</ul>
					</>
				) : (
					<>
						<div className="flex items-center justify-between">
							<p className="text-sm font-semibold text-ink">Enterprise — what's included</p>
							<p className="text-base font-bold text-ink">$100<span className="text-xs font-normal text-ink-3">/mo</span></p>
						</div>
						<p className="text-xs text-ink-3">26 seats + admin included. No per-seat math. Everything in Business, plus:</p>
						<ul className="space-y-1.5">
							{[
								"Reports & performance analytics",
								"CSV export",
								"AI assistance",
								"SMS → ticket",
								"Email → ticket",
							].map((f) => (
								<li key={f} className="flex items-center gap-2 text-xs text-ink-3">
									<Check className="w-3 h-3 text-mint shrink-0" />
									{f}
								</li>
							))}
						</ul>
					</>
				)}
			</div>

			{/* Trial notice */}
			{!hadTrial && (
				<div className="rounded-lg bg-mint/10 border border-mint/20 px-4 py-3">
					<p className="text-sm font-medium text-ink">14-day free trial</p>
					<p className="text-xs text-ink-3 mt-0.5">
						Your card will be saved but not charged until the trial ends.
					</p>
				</div>
			)}

			{hadTrial && (
				<div className="rounded-lg bg-warning/10 border border-warning/20 px-4 py-3">
					<p className="text-sm font-medium text-ink">No second trial</p>
					<p className="text-xs text-ink-3 mt-0.5">
						You've previously used a trial on this account. Your card will be charged immediately upon setup.
					</p>
				</div>
			)}

			{/* Card input */}
			<div className="space-y-2">
				<label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
					Payment method
				</label>
				<div className="rounded-lg border border-border bg-background px-3 py-3">
					<CardElement options={CARD_ELEMENT_OPTIONS} />
				</div>
				<p className="text-[11px] text-ink-3">
					Secured by Stripe. Your card details never touch our servers.
				</p>
			</div>

			{error && (
				<div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
					<p className="text-sm text-destructive">{error}</p>
				</div>
			)}

			<Button
				className="w-full"
				isLoading={isPending}
				disabled={!stripe || isPending}
				onClick={() => { setError(null); setup(); }}
			>
				{hadTrial
					? `Subscribe to ${plan === "business" ? "Business" : "Enterprise"} Plan`
					: `Start Free Trial — ${plan === "business" ? "Business" : "Enterprise"}`}
			</Button>

			<p className="text-center text-[11px] text-ink-3">
				By continuing you agree to our{" "}
				<a href="/terms" className="underline hover:text-ink">Terms of Service</a>.
				Cancel anytime from Settings.
			</p>
		</div>
	);
}

export default function BillingSetupForm({ orgName, hadTrial }: Props) {
	return (
		<Elements stripe={stripePromise}>
			<SetupForm orgName={orgName} hadTrial={hadTrial} />
		</Elements>
	);
}
