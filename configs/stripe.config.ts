import Stripe from "stripe";

export const STRIPE_PRICES = {
	business: {
		base_monthly:     process.env.STRIPE_BUSINESS_BASE_MONTHLY     ?? "",  // $20/mo
		seat_monthly:     process.env.STRIPE_BUSINESS_SEAT_MONTHLY     ?? "",  // $3.99/seat/mo
		base_annual:      process.env.STRIPE_BUSINESS_BASE_ANNUAL      ?? "",  // $200/yr
		seat_annual:      process.env.STRIPE_BUSINESS_SEAT_ANNUAL      ?? "",  // $39.90/yr
	},
	enterprise: {
		base_monthly:     process.env.STRIPE_ENTERPRISE_BASE_MONTHLY   ?? "",  // $100/mo
		base_annual:      process.env.STRIPE_ENTERPRISE_BASE_ANNUAL    ?? "",  // $1000/yr
		seat_monthly:     process.env.STRIPE_ENTERPRISE_SEAT_MONTHLY   ?? "",  // $3.99/extra seat/mo (above 26)
		seat_annual:      process.env.STRIPE_ENTERPRISE_SEAT_ANNUAL    ?? "",  // $39.90/extra seat/yr
	},
} as const;

export type BillingPlan     = "business" | "enterprise";
export type BillingInterval = "monthly" | "annual";

export const BUSINESS_SEAT_PRICE_USD  = 3.99;
export const BUSINESS_BASE_PRICE_USD  = 20;
export const ENTERPRISE_BASE_PRICE_USD = 100;
export const ENTERPRISE_INCLUDED_SEATS = 26;
export const TRIAL_INCLUDED_SEATS = 11;

export const LOCKED_PLANS = ["pending", "unpaid", "cancelled"] as const;
export type OrgPlan = "pending" | "unpaid" | "trial" | "business" | "enterprise" | "cancelled";

export function getStripe() {
	return new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
		apiVersion: "2026-01-28.clover",
	});
}
