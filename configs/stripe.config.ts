import Stripe from "stripe";

export type PlanName = "Pro" | "Enterprise";

export const PLANS: Record<PlanName, { priceId: string }> = {
  Pro: { priceId: process.env.STRIPE_PRO_PRICE_ID ?? "" },
  Enterprise: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "" },
};

export const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2026-01-28.clover",
  });
