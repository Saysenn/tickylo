export const ROLES = {
	ADMIN: "admin",
	EMPLOYEE: "employee",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const DEFAULT_ROLE: Role = ROLES.EMPLOYEE;

/**
 * Route permission map.
 * Key   → route prefix (startsWith match)
 * Value → roles that CAN access it
 *
 * Routes NOT listed here are accessible to all authenticated users.
 * To add a new restriction: add one line here — nothing else changes.
 */
export const ROUTE_PERMISSIONS: Record<string, Role[]> = {
	"/dashboard/employees": [ROLES.ADMIN],
	"/dashboard/reports": [ROLES.ADMIN],
};

export const UNAUTHORIZED_REDIRECT = "/dashboard";
