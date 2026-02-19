import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { authError } from "@/lib/auth-errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, password } = validated.data;

    const supabase = createAdminClient();
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: name },
      email_confirm: false,
    });

    if (createError || !data.user) {
      return NextResponse.json(
        { error: authError.signup(createError?.message ?? "") },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[register] Unhandled error:", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}
