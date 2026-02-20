"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
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
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";

export function ResetPasswordForm() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [formData, setFormData]       = useState<ResetPasswordInput>({ password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ResetPasswordInput, string>>>({});

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

    const validated = resetPasswordSchema.safeParse(formData);
    if (!validated.success) {
      const errs: Partial<Record<keyof ResetPasswordInput, string>> = {};
      validated.error.issues.forEach((err) => {
        if (err.path[0]) errs[err.path[0] as keyof ResetPasswordInput] = err.message;
      });
      setFieldErrors(errs);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: validated.data.password,
      });

      if (updateError) {
        setError(authError.resetPassword(updateError.message));
        setIsLoading(false);
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg border-0">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 bg-mint rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(128,237,153,0.35)]">
          <Lock className="w-6 h-6 text-ink" strokeWidth={2} />
        </div>
        <CardTitle className="text-2xl font-bold text-ink">Set new password</CardTitle>
        <CardDescription className="text-ink-3">
          Choose a strong password for your account
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-ink-2 text-sm">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter new password"
                value={formData.password}
                onChange={handleChange}
                className="pl-9"
                autoComplete="new-password"
                autoFocus
              />
            </div>
            {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-ink-2 text-sm">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="pl-9"
                autoComplete="new-password"
              />
            </div>
            {fieldErrors.confirmPassword && <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_2px_14px_rgba(128,237,153,0.35)]"
            isLoading={isLoading}
          >
            Reset password
          </Button>

          <Link href="/login" className="text-sm text-ink-3 hover:text-ink-2 transition-colors">
            Back to login
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
