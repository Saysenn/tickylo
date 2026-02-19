import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Safe-redirect: only allow relative paths that start with `/` and have no protocol. */
function safeRedirect(next: string | null): string {
  if (!next) return "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//") || /^\/[a-z]+:/i.test(next)) {
    return "/dashboard";
  }
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = safeRedirect(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
