export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  twoFactorEnabled: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
