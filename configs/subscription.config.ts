export const PLAN_LIMITS = {
  Free: {
    generationsPerWeek: 5,
  },
  Pro: {
    generationsPerWeek: 20,
  },
  Enterprise: {
    generationsPerWeek: 50,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export const PLAN_PRICES = {
  Free: 0,
  Pro: 99,
  Enterprise: 299,
} as const;
