"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authError } from "@/lib/auth-errors";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function TwoFactorVerifyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      // List enrolled TOTP factors
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError || !factors?.totp?.length) {
        setError("No authenticator app found. Please contact support.");
        setIsLoading(false);
        return;
      }

      const factorId = factors.totp[0].id;

      // Create a fresh challenge
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError || !challenge) {
        setError("Failed to initiate verification. Please try again.");
        setIsLoading(false);
        return;
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) {
        setError(authError.mfa(verifyError.message));
        setIsLoading(false);
        return;
      }

      // Success — session is now AAL2, redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Card className="w-full shadow-lg border-0">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 bg-mint rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(128,237,153,0.35)]">
          <ShieldCheck className="w-7 h-7 text-ink" strokeWidth={2} />
        </div>
        <CardTitle className="text-2xl font-bold text-ink">
          Verify your identity
        </CardTitle>
        <CardDescription className="text-ink-3 mt-1">
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleVerify}>
        <CardContent className="space-y-5 pt-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code" className="text-ink-2 text-sm font-medium">
              Authentication code
            </Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="000 000"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              maxLength={6}
              className="text-center text-3xl tracking-[0.6em] font-mono h-14 border-glass-border focus-visible:ring-mint/30"
              autoFocus
              autoComplete="one-time-code"
            />
          </div>

          <p className="text-xs text-ink-3 text-center">
            Open your authenticator app (e.g. Google Authenticator, Authy) to find your code.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            type="submit"
            className="w-full bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_2px_14px_rgba(128,237,153,0.35)] hover:shadow-[0_4px_22px_rgba(128,237,153,0.50)]"
            disabled={code.length !== 6 || isLoading}
            isLoading={isLoading}
          >
            Verify & continue
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-ink-3 hover:text-ink-2"
            onClick={handleSignOut}
          >
            Sign out and use a different account
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
