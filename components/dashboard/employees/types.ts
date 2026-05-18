import type { Role } from "@/configs/rbac.config";

export interface Employee {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  last_sign_in_at: string | null;
  department: { id: string; name: string } | null;
}
