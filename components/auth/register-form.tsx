"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authError } from "@/lib/auth-errors";
import { isAxiosError } from "axios";
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
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import APIService from "@/services/api";

export function RegisterForm() {
	const [isLoading, setIsLoading] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [formData, setFormData] = useState<RegisterInput>({
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
	});
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof RegisterInput, string>>
	>({});

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
		setSuccess(null);

		const validated = registerSchema.safeParse(formData);
		if (!validated.success) {
			const errs: Partial<Record<keyof RegisterInput, string>> = {};
			validated.error.issues.forEach((err) => {
				if (err.path[0]) errs[err.path[0] as keyof RegisterInput] = err.message;
			});
			setFieldErrors(errs);
			setIsLoading(false);
			return;
		}

		try {
			/** includes saving public user */
			await APIService.auth.register(validated.data);
		} catch (err) {
			if (isAxiosError(err)) {
				setError(authError.signup(err.response?.data?.error ?? ""));
			} else {
				setError("Registration failed. Please try again.");
			}
			setIsLoading(false);
			return;
		}

		setSuccess(
			"Account created! Check your email for a confirmation link, then sign in.",
		);
		setIsLoading(false);
	};

	const handleGoogleSignIn = async () => {
		setIsGoogleLoading(true);
		const supabase = createClient();
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: APIService.auth.callback(),
				queryParams: { prompt: "select_account" },
			},
		});
		if (error) {
			setError("Failed to sign up with Google.");
			setIsGoogleLoading(false);
		}
	};

	return (
		<Card className="w-full shadow-lg border-0">
			<CardHeader className="text-center pb-2">
				<div className="mx-auto w-14 h-14 bg-mint rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(128,237,153,0.35)]">
					<User className="w-6 h-6 text-ink" strokeWidth={2} />
				</div>
				<CardTitle className="text-2xl font-bold text-ink">
					Create an account
				</CardTitle>
				<CardDescription className="text-ink-3">
					Get started with your free account
				</CardDescription>
			</CardHeader>

			<form onSubmit={handleSubmit}>
				<CardContent className="space-y-4 pt-4">
					{error && (
						<div className="p-3 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl">
							{error}
						</div>
					)}
					{success && (
						<div className="p-3 text-sm text-ink-2 bg-mint/12 border border-mint/30 rounded-xl">
							{success}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="name" className="text-ink-2 text-sm">
							Full Name
						</Label>
						<div className="relative">
							<User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
							<Input
								id="name"
								name="name"
								type="text"
								placeholder="John Doe"
								value={formData.name}
								onChange={handleChange}
								className="pl-9"
								autoComplete="name"
							/>
						</div>
						{fieldErrors.name && (
							<p className="text-xs text-destructive">{fieldErrors.name}</p>
						)}
					</div>

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
							/>
						</div>
						{fieldErrors.email && (
							<p className="text-xs text-destructive">{fieldErrors.email}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="password" className="text-ink-2 text-sm">
							Password
						</Label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
							<Input
								id="password"
								name="password"
								type="password"
								placeholder="Create a strong password"
								value={formData.password}
								onChange={handleChange}
								className="pl-9"
								autoComplete="new-password"
							/>
						</div>
						{fieldErrors.password && (
							<p className="text-xs text-destructive">{fieldErrors.password}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="confirmPassword" className="text-ink-2 text-sm">
							Confirm Password
						</Label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								placeholder="Confirm your password"
								value={formData.confirmPassword}
								onChange={handleChange}
								className="pl-9"
								autoComplete="new-password"
							/>
						</div>
						{fieldErrors.confirmPassword && (
							<p className="text-xs text-destructive">
								{fieldErrors.confirmPassword}
							</p>
						)}
					</div>

					<p className="text-xs text-ink-3">
						Password must be at least 8 characters with uppercase, lowercase,
						number, and special character.
					</p>
				</CardContent>

				<CardFooter className="flex flex-col gap-4">
					<Button
						type="submit"
						className="w-full bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_2px_14px_rgba(128,237,153,0.35)] hover:shadow-[0_4px_22px_rgba(128,237,153,0.50)]"
						isLoading={isLoading}
					>
						Create account
					</Button>

					<div className="relative w-full">
						<div className="absolute inset-0 flex items-center">
							<Separator />
						</div>
						<div className="relative flex justify-center text-xs">
							<span className="px-3 bg-white text-muted-foreground">
								or continue with
							</span>
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
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						Continue with Google
					</Button>

					<p className="text-sm text-center text-ink-3">
						Already have an account?{" "}
						<Link
							href="/login"
							className="text-ink-2 hover:text-ink font-medium transition-colors"
						>
							Sign in
						</Link>
					</p>
				</CardFooter>
			</form>
		</Card>
	);
}
