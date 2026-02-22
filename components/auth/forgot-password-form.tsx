"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authError } from "@/lib/auth/auth-errors";
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
import {
	forgotPasswordSchema,
	type ForgotPasswordInput,
} from "@/lib/validations/auth";
import api from "@/lib/infra/api";

export function ForgotPasswordForm() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const [formData, setFormData] = useState<ForgotPasswordInput>({ email: "" });
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof ForgotPasswordInput, string>>
	>({});

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData((p) => ({ ...p, email: e.target.value }));
		setFieldErrors({});
		setError(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		const validated = forgotPasswordSchema.safeParse(formData);
		if (!validated.success) {
			const errs: Partial<Record<keyof ForgotPasswordInput, string>> = {};
			validated.error.issues.forEach((err) => {
				if (err.path[0])
					errs[err.path[0] as keyof ForgotPasswordInput] = err.message;
			});
			setFieldErrors(errs);
			setIsLoading(false);
			return;
		}

		try {
			const supabase = createClient();
			const { error: resetError } = await supabase.auth.resetPasswordForEmail(
				validated.data.email,
				{ redirectTo: api.auth.resetPassword() },
			);

			if (resetError) {
				setError(authError.forgotPassword(resetError.message));
				setIsLoading(false);
				return;
			}

			setSuccess(true);
		} catch {
			setError("Something went wrong. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	if (success) {
		return (
			<Card className="w-full shadow-lg border-0">
				<CardHeader className="text-center pb-2">
					<div className="mx-auto w-14 h-14 bg-mint rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(128,237,153,0.35)]">
						<Mail className="w-6 h-6 text-ink" strokeWidth={2} />
					</div>
					<CardTitle className="text-2xl font-bold text-ink">
						Check your email
					</CardTitle>
					<CardDescription className="text-ink-3">
						We&apos;ve sent a password reset link to{" "}
						<span className="font-medium text-ink-2">{formData.email}</span>
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-2">
					<p className="text-sm text-ink-3 text-center">
						Didn&apos;t receive it? Check your spam folder or{" "}
						<button
							onClick={() => setSuccess(false)}
							className="text-ink-2 hover:text-ink font-medium transition-colors underline underline-offset-2"
						>
							try again
						</button>
						.
					</p>
				</CardContent>
				<CardFooter className="justify-center">
					<Link
						href="/login"
						className="text-sm text-ink-3 hover:text-ink-2 transition-colors"
					>
						Back to login
					</Link>
				</CardFooter>
			</Card>
		);
	}

	return (
		<Card className="w-full shadow-lg border-0">
			<CardHeader className="text-center pb-2">
				<div className="mx-auto w-14 h-14 bg-mint rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(128,237,153,0.35)]">
					<KeyRound className="w-6 h-6 text-ink" strokeWidth={2} />
				</div>
				<CardTitle className="text-2xl font-bold text-ink">
					Forgot password?
				</CardTitle>
				<CardDescription className="text-ink-3">
					Enter your email and we&apos;ll send you a reset link
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
						<Label htmlFor="email" className="text-ink-2 text-sm">
							Email
						</Label>
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
								autoFocus
							/>
						</div>
						{fieldErrors.email && (
							<p className="text-xs text-destructive">{fieldErrors.email}</p>
						)}
					</div>
				</CardContent>

				<CardFooter className="flex flex-col gap-4">
					<Button
						type="submit"
						className="w-full bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_2px_14px_rgba(128,237,153,0.35)]"
						isLoading={isLoading}
					>
						Send reset link
					</Button>

					<Link
						href="/login"
						className="text-sm text-ink-3 hover:text-ink-2 transition-colors"
					>
						Back to login
					</Link>
				</CardFooter>
			</form>
		</Card>
	);
}
