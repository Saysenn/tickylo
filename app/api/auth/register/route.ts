import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { authError } from "@/lib/auth-errors";
import { ROLES, DEFAULT_ROLE } from "@/configs/rbac.config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, password } = validated.data;

    const admin = createAdminClient();

    // Determine role: first registered user becomes admin — no DB required,
    // we count via the admin auth API (only needs SUPABASE_SERVICE_ROLE_KEY).
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1 });
    const role = (usersData?.users?.length ?? 1) === 0 ? ROLES.ADMIN : DEFAULT_ROLE;

    const { data, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: name },
      app_metadata: { role },
      email_confirm: false,
    });

    if (createError || !data.user) {
      return NextResponse.json(
        { error: authError.signup(createError?.message ?? "") },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error("[register] Unhandled error:", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}
