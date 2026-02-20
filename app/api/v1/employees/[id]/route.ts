import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, errorResponse } from "@/lib/response";
import { ROLES, type Role } from "@/configs/rbac.config";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum([ROLES.ADMIN, ROLES.EMPLOYEE]).optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if ((user.app_metadata?.role as Role) !== ROLES.ADMIN) return null;
  return user;
}

// PATCH /api/v1/employees/[id] — update name and/or role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const caller = await requireAdmin();
    if (!caller) return errorResponse("Forbidden", 403);

    const { id } = await params;
    const body = await request.json();
    const validated = updateEmployeeSchema.safeParse(body);
    if (!validated.success) {
      return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { name, role } = validated.data;
    const admin = createAdminClient();

    const updatePayload: Parameters<typeof admin.auth.admin.updateUserById>[1] = {};
    if (name) updatePayload.user_metadata = { full_name: name };
    if (role) updatePayload.app_metadata = { role };

    const { data, error } = await admin.auth.admin.updateUserById(id, updatePayload);
    if (error) return errorResponse(error.message, 400);

    return ok({ id: data.user.id, name, role });
  } catch (err) {
    console.error("[employees:PATCH]", err);
    return errorResponse("Internal server error", 500);
  }
}

// DELETE /api/v1/employees/[id] — delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const caller = await requireAdmin();
    if (!caller) return errorResponse("Forbidden", 403);

    const { id } = await params;

    // Prevent self-deletion
    if (caller.id === id) return errorResponse("Cannot delete your own account", 400);

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return errorResponse(error.message, 400);

    return ok({ success: true });
  } catch (err) {
    console.error("[employees:DELETE]", err);
    return errorResponse("Internal server error", 500);
  }
}
