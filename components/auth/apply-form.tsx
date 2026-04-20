"use client";

import { useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import APIService from "@/lib/infra/api";

export function ApplyForm() {
	const [form, setForm] = useState({
		company_name: "",
		admin_name: "",
		admin_email: "",
		password: "",
		confirm_password: "",
		reason: "",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [submitted, setSubmitted] = useState(false);

	function set(field: string, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (form.password !== form.confirm_password) {
			setError("Passwords do not match.");
			return;
		}

		setLoading(true);
		try {
			await APIService.org.apply(form);
			setSubmitted(true);
		} catch (err: any) {
			setError(err?.response?.data?.error ?? "Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	if (submitted) {
		return (
			<div className="glass rounded-2xl p-8 text-center space-y-4">
				<div className="w-12 h-12 rounded-full bg-mint/15 flex items-center justify-center mx-auto">
					<CheckCircle2 className="w-6 h-6 text-mint" />
				</div>
				<h2 className="text-xl font-bold text-ink">Application Submitted</h2>
				<p className="text-sm text-ink-3 leading-relaxed">
					Thank you! We&apos;ll review your registration for{" "}
					<span className="font-semibold text-ink">{form.company_name}</span> and email you within 24 hours.
					You can log in once your application is approved.
				</p>
			</div>
		);
	}

	return (
		<div className="glass rounded-2xl p-8 space-y-6">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-mint/15 flex items-center justify-center">
					<Building2 className="w-5 h-5 text-mint" />
				</div>
				<div>
					<h1 className="text-xl font-bold text-ink">Register Your Company</h1>
					<p className="text-xs text-ink-3 mt-0.5">We&apos;ll review and approve within 24 hours</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-1.5">
					<Label htmlFor="company_name">Company Name</Label>
					<Input
						id="company_name"
						placeholder="Acme Corp"
						value={form.company_name}
						onChange={(e) => set("company_name", e.target.value)}
						required
					/>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label htmlFor="admin_name">Your Name</Label>
						<Input
							id="admin_name"
							placeholder="John Doe"
							value={form.admin_name}
							onChange={(e) => set("admin_name", e.target.value)}
							required
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="admin_email">Work Email</Label>
						<Input
							id="admin_email"
							type="email"
							placeholder="you@acme.com"
							value={form.admin_email}
							onChange={(e) => set("admin_email", e.target.value)}
							required
						/>
					</div>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="password">Password</Label>
					<PasswordInput
						id="password"
						placeholder="Minimum 8 characters"
						value={form.password}
						onChange={(e) => set("password", e.target.value)}
						required
						minLength={8}
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="confirm_password">Confirm Password</Label>
					<PasswordInput
						id="confirm_password"
						placeholder="Re-enter your password"
						value={form.confirm_password}
						onChange={(e) => set("confirm_password", e.target.value)}
						required
						minLength={8}
					/>
					{form.confirm_password.length > 0 && (
						<p className={`text-xs ${form.password === form.confirm_password ? "text-green-600" : "text-red-500"}`}>
							{form.password === form.confirm_password ? "✓ Passwords match" : "✗ Passwords do not match"}
						</p>
					)}
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="reason">
						About your company{" "}
						<span className="text-ink-3 font-normal">(optional)</span>
					</Label>
					<textarea
						id="reason"
						className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-mint resize-none"
						rows={3}
						placeholder="Brief description of your company and how you plan to use Tickworks..."
						value={form.reason}
						onChange={(e) => set("reason", e.target.value)}
					/>
				</div>

				{error && (
					<p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
				)}

				<Button type="submit" className="w-full" isLoading={loading}>
					Submit Application
				</Button>
			</form>
		</div>
	);
}
