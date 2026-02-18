"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();

  const [isLoading, setIsLoading]             = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  const [formData, setFormData]     = useState<LoginInput>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});

  // 2FA step (shown inline after successful password login if TOTP is enrolled)
  const [requires2FA, setRequires2FA] = useState(false);
  const [factorId, setFactorId]       = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setFieldErrors((p) => ({ ...p, [name]: undefined }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    // ── 2FA verification step ───────────────────────────────────────────────────
    if (requires2FA && factorId) {
      try {
        const { data: challenge, error: challengeErr } =
          await supabase.auth.mfa.challenge({ factorId });
        if (challengeErr || !challenge) {
          setError("Failed to initiate 2FA challenge. Please try again.");
          setIsLoading(false);
          return;
        }
        const { error: verifyErr } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challenge.id,
          code: twoFactorCode,
        });
        if (verifyErr) {
          setError(authError.mfa(verifyErr.message));
          setIsLoading(false);
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      }
      return;
    }

    // ── Password login ──────────────────────────────────────────────────────────
    const validated = loginSchema.safeParse(formData);
    if (!validated.success) {
      const errs: Partial<Record<keyof LoginInput, string>> = {};
      validated.error.issues.forEach((err) => {
        if (err.path[0]) errs[err.path[0] as keyof LoginInput] = err.message;
      });
      setFieldErrors(errs);
      setIsLoading(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validated.data.email,
        password: validated.data.password,
      });
      if (signInError) {
        setError(authError.login(signInError.message));
        setIsLoading(false);
        return;
      }

      // Check if TOTP 2FA is enrolled — if so, show inline verification
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];
        if (totpFactor) {
          setFactorId(totpFactor.id);
          setRequires2FA(true);
          setIsLoading(false);
          return;
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) {
      setError(authError.google(error.message));
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg border-0">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 bg-mint rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(128,237,153,0.35)]">
          <Lock className="w-6 h-6 text-ink" strokeWidth={2} />
        </div>
        <CardTitle className="text-2xl font-bold text-ink">Welcome back</CardTitle>
        <CardDescription className="text-ink-3">Sign in to your account to continue</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl">
              {error}
            </div>
          )}

          {!requires2FA ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-ink-2 text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-ink-2 text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-9"
                    autoComplete="current-password"
                  />
                </div>
                {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-mint/10 border border-mint/25 rounded-xl text-center">
                <ShieldCheck className="w-8 h-8 text-ink-2 mx-auto mb-2" />
                <p className="text-sm font-medium text-ink">Two-Factor Authentication</p>
                <p className="text-xs text-ink-3 mt-0.5">Enter the 6-digit code from your authenticator app</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="2fa-code" className="text-ink-2 text-sm">Authentication code</Label>
                <Input
                  id="2fa-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000 000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => { setRequires2FA(false); setFactorId(null); setTwoFactorCode(""); setError(null); }}
                className="text-xs text-ink-3 hover:text-ink-2 transition-colors"
              >
                Use a different account
              </button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_2px_14px_rgba(128,237,153,0.35)]"
            isLoading={isLoading}
          >
            {requires2FA ? "Verify & Sign in" : "Sign in"}
          </Button>

          {!requires2FA && (
            <>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center"><Separator /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-muted-foreground">or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                isLoading={isGoogleLoading}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <p className="text-sm text-center text-ink-3">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-ink-2 hover:text-ink font-medium transition-colors">
                  Sign up
                </Link>
              </p>
            </>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
