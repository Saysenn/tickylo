/**
 * lib/stripe.ts
 * Re-exports from configs/stripe.ts.
 * All Stripe logic imports should use this path.
 */
export { getStripe, PLANS } from "@/configs/stripe.config";
export type { PlanName } from "@/configs/stripe.config";
