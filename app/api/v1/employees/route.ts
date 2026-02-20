import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, errorResponse } from "@/lib/response";
import { ROLES, DEFAULT_ROLE, type Role } from "@/configs/rbac.config";
import { z } from "zod";

const createEmployeeSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([ROLES.ADMIN, ROLES.EMPLOYEE]).default(DEFAULT_ROLE),
});

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if ((user.app_metadata?.role as Role) !== ROLES.ADMIN) return null;
  return user;
}

// GET /api/v1/employees?page=1&limit=10 — paginated user list
export async function GET(request: NextRequest) {
  try {
    const caller = await requireAdmin();
    if (!caller) return errorResponse("Forbidden", 403);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return errorResponse(error.message, 500);

    const employees = data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.full_name ?? u.user_metadata?.name ?? null) as string | null,
      avatar_url: (u.user_metadata?.avatar_url ?? null) as string | null,
      role: (u.app_metadata?.role ?? DEFAULT_ROLE) as Role,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));

    return ok({ data: employees, page, totalPages: data.lastPage });
  } catch (err) {
    console.error("[employees:GET]", err);
    return errorResponse("Internal server error", 500);
  }
}

// POST /api/v1/employees — create a new user
export async function POST(request: NextRequest) {
  try {
    const caller = await requireAdmin();
    if (!caller) return errorResponse("Forbidden", 403);

    const body = await request.json();
    const validated = createEmployeeSchema.safeParse(body);
    if (!validated.success) {
      return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { name, email, password, role } = validated.data;

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: name },
      app_metadata: { role },
      email_confirm: true,
    });

    if (error) return errorResponse(error.message, 400);

    return ok({
      id: data.user.id,
      email: data.user.email,
      name,
      role,
      created_at: data.user.created_at,
    }, 201);
  } catch (err) {
    console.error("[employees:POST]", err);
    return errorResponse("Internal server error", 500);
  }
}
