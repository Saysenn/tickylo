import type { Role } from "@/configs/rbac.config";

export interface UserProfile {
	id: string;
	email: string;
	name: string | null;
	avatar_url: string | null;
	twoFactorEnabled: boolean;
	role: Role;
	org_id: string | null;
}

export interface AuthState {
	user: UserProfile | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}
