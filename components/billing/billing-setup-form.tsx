"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useMutation } from "@tanstack/react-query";
import { Building2, Users, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import APIService from "@/lib/infra/api";
import {
	BUSINESS_SEAT_PRICE_USD,
	BUSINESS_BASE_PRICE_USD,
	ENTERPRISE_BASE_PRICE_USD,
	ENTERPRISE_INCLUDED_SEATS,
} from "@/configs/stripe.config";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

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

const BUSINESS_FEATURES = [
	"Ticketing and task management",
	"Per-ticket time tracking",
	"Departments and bulk operations",
	"Ticket requests and templates",
	"Leave management",
	"File and image attachments",
	"Team overview and time manager",
	"Audit log and GDPR tools",
	"Work schedule configuration",
	"Browser extension",
];

const ENTERPRISE_EXTRAS = [
	"Everything in Business",
	"Reports and performance analytics",
	"CSV export",
	"AI assistance",
	"SMS to ticket",
	"Email to ticket",
];

interface Props { orgName: string; hadTrial: boolean }

function SetupForm({ orgName, hadTrial }: Props) {
	const stripe   = useStripe();
	const elements = useElements();
	const router   = useRouter();

	const [plan, setPlan]           = useState<Plan>("business");
	const [seatCount, setSeatCount] = useState(5);
	const [entSeats, setEntSeats]   = useState(ENTERPRISE_INCLUDED_SEATS);
	const [error, setError]         = useState<string | null>(null);

	const businessTotal  = BUSINESS_BASE_PRICE_USD + seatCount * BUSINESS_SEAT_PRICE_USD;
	const entExtraSeats  = Math.max(0, entSeats - ENTERPRISE_INCLUDED_SEATS);
	const enterpriseTotal = ENTERPRISE_BASE_PRICE_USD + entExtraSeats * BUSINESS_SEAT_PRICE_USD;

	const { mutate: setup, isPending } = useMutation({
		mutationFn: async () => {
			if (!stripe || !elements) throw new Error("Stripe not loaded");
			const card = elements.getElement(CardElement);
			if (!card) throw new Error("Card element not found");
			const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({ type: "card", card });
			if (pmErr) throw new Error(pmErr.message);
			if (!paymentMethod) throw new Error("Payment method creation failed");
			return APIService.billing.setup({
				plan,
				seat_count:        plan === "business" ? seatCount : entSeats,
				interval:          "monthly",
				payment_method_id: paymentMethod.id,
			});
		},
		onSuccess: () => router.push("/billing/success"),
		onError: (err: any) => setError(err?.response?.data?.error ?? err?.message ?? "Setup failed"),
	});

	return (
		<div className="space-y-8">
			{/* Plan selector */}
			<div className="grid grid-cols-2 gap-3">
				{([
					{ key: "business" as Plan, Icon: Building2, label: "Business", price: `$${BUSINESS_BASE_PRICE_USD}/mo + $${BUSINESS_SEAT_PRICE_USD}/seat`, sub: "Pay only for what you need" },
					{ key: "enterprise" as Plan, Icon: Users, label: "Enterprise", price: `$${ENTERPRISE_BASE_PRICE_USD}/mo flat`, sub: `${ENTERPRISE_INCLUDED_SEATS} seats included` },
				] as const).map(({ key, Icon, label, price, sub }) => (
					<button
						key={key}
						type="button"
						onClick={() => setPlan(key)}
						className={cn(
							"text-left p-4 rounded-xl border-2 transition-all",
							plan === key ? "border-mint bg-mint/5" : "border-border hover:border-border/80 bg-card",
						)}
					>
						<div className="flex items-start justify-between gap-2 mb-3">
							<div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", plan === key ? "bg-mint/20" : "bg-accent")}>
								<Icon className={cn("w-4 h-4", plan === key ? "text-mint" : "text-ink-3")} />
							</div>
							{plan === key && (
								<span className="text-[10px] font-semibold text-mint bg-mint/10 px-2 py-0.5 rounded-full">Selected</span>
							)}
						</div>
						<p className="font-semibold text-ink text-sm">{label}</p>
						<p className="text-xs text-ink-3 mt-0.5">{price}</p>
						<p className="text-[11px] text-ink-3/60 mt-0.5">{sub}</p>
					</button>
				))}
			</div>

			{/* Seat count */}
			{plan === "business" && (
				<SeatPicker
					label="Number of employee seats"
					count={seatCount}
					min={1}
					max={500}
					onChange={setSeatCount}
					note={`$${BUSINESS_BASE_PRICE_USD} base + ${seatCount} × $${BUSINESS_SEAT_PRICE_USD}/mo`}
					total={businessTotal}
				/>
			)}

			{plan === "enterprise" && (
				<SeatPicker
					label="Total seats"
					count={entSeats}
					min={ENTERPRISE_INCLUDED_SEATS}
					max={500}
					onChange={setEntSeats}
					note={
						entExtraSeats > 0
							? `$${ENTERPRISE_BASE_PRICE_USD} flat + ${entExtraSeats} extra × $${BUSINESS_SEAT_PRICE_USD}/mo`
							: `${ENTERPRISE_INCLUDED_SEATS} seats included in base price`
					}
					total={enterpriseTotal}
				/>
			)}

			{/* What you get */}
			<div className="rounded-xl border border-border/60 bg-accent/20 p-4 space-y-3">
				<p className="text-sm font-semibold text-ink">
					{plan === "business" ? "Business includes" : "Enterprise includes"}
				</p>
				<ul className="grid grid-cols-1 gap-1.5">
					{(plan === "business" ? BUSINESS_FEATURES : ENTERPRISE_EXTRAS).map((f) => (
						<li key={f} className="flex items-center gap-2 text-xs text-ink-3">
							<Check className="w-3 h-3 text-mint shrink-0" />
							{f}
						</li>
					))}
				</ul>
			</div>

			{/* Trial / no-trial notice */}
			<div className={cn(
				"rounded-xl px-4 py-3 text-sm",
				hadTrial ? "bg-warning/10 border border-warning/20" : "bg-mint/10 border border-mint/20",
			)}>
				{hadTrial ? (
					<>
						<p className="font-medium text-ink">No second trial</p>
						<p className="text-xs text-ink-3 mt-0.5">Your card will be charged immediately when you subscribe.</p>
					</>
				) : (
					<>
						<p className="font-medium text-ink">14-day free trial</p>
						<p className="text-xs text-ink-3 mt-0.5">Your card is saved but not charged until the trial ends.</p>
					</>
				)}
			</div>

			{/* Card input */}
			<div className="space-y-2">
				<label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Payment method</label>
				<div className="rounded-xl border border-border bg-background px-3 py-3">
					<CardElement options={CARD_ELEMENT_OPTIONS} />
				</div>
				<p className="flex items-center gap-1.5 text-[11px] text-ink-3">
					<Lock className="w-3 h-3" />
					Secured by Stripe. Your card details never touch our servers.
				</p>
			</div>

			{error && (
				<div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
					<p className="text-sm text-destructive">{error}</p>
				</div>
			)}

			<Button
				className="w-full"
				size="lg"
				isLoading={isPending}
				disabled={!stripe || isPending}
				onClick={() => { setError(null); setup(); }}
			>
				{hadTrial
					? `Subscribe — ${plan === "business" ? `$${businessTotal.toFixed(2)}` : `$${enterpriseTotal.toFixed(2)}`}/mo`
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

function SeatPicker({
	label, count, min, max, onChange, note, total,
}: {
	label: string; count: number; min: number; max: number;
	onChange: (n: number) => void; note: string; total: number;
}) {
	return (
		<div className="space-y-2">
			<label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">{label}</label>
			<div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-accent/20 px-4 py-3">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => onChange(Math.max(min, count - 1))}
						className="w-8 h-8 rounded-lg border border-border bg-background text-ink-3 hover:text-ink hover:bg-accent transition-colors text-xl font-light leading-none flex items-center justify-center"
					>
						−
					</button>
					<span className="w-10 text-center font-bold text-ink text-lg">{count}</span>
					<button
						type="button"
						onClick={() => onChange(Math.min(max, count + 1))}
						className="w-8 h-8 rounded-lg border border-border bg-background text-ink-3 hover:text-ink hover:bg-accent transition-colors text-xl font-light leading-none flex items-center justify-center"
					>
						+
					</button>
					<span className="text-sm text-ink-3">seat{count !== 1 ? "s" : ""}</span>
				</div>
				<div className="text-right">
					<p className="text-lg font-bold text-ink">${total.toFixed(2)}<span className="text-xs font-normal text-ink-3">/mo</span></p>
					<p className="text-[11px] text-ink-3">{note}</p>
				</div>
			</div>
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
