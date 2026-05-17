"use client";

import { useState, useEffect } from "react";
import { Users, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import APIService from "@/lib/infra/api";

type Step = "code" | "details" | "success";

export function JoinForm({ initialCode }: { initialCode?: string }) {
	const [step, setStep] = useState<Step>("code");
	const [code, setCode] = useState(initialCode ?? "");
	const [orgName, setOrgName] = useState("");
	const [form, setForm] = useState({ name: "", email: "", password: "" });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
	const [acceptedTerms, setAcceptedTerms] = useState(false);

	useEffect(() => {
		if (initialCode) {
			APIService.org.checkJoinCode(initialCode)
				.then((org: any) => { setOrgName(org.name); setStep("details"); })
				.catch(() => {});
		}
	}, [initialCode]);

	function setField(field: string, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	async function checkCode(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const org = await APIService.org.checkJoinCode(code);
			setOrgName(org.name);
			setStep("details");
		} catch (err: any) {
			setError(err?.response?.data?.error ?? "Invalid join code. Please check with your admin.");
		} finally {
			setLoading(false);
		}
	}

	async function handleJoin(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await APIService.org.join({ org_join_code: code, ...form, accepted_privacy: true, accepted_terms: true });
			setStep("success");
		} catch (err: any) {
			setError(err?.response?.data?.error ?? "Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	if (step === "success") {
		return (
			<div className="glass rounded-2xl p-8 text-center space-y-4">
				<div className="w-12 h-12 rounded-full bg-mint/15 flex items-center justify-center mx-auto">
					<CheckCircle2 className="w-6 h-6 text-mint" />
				</div>
				<h2 className="text-xl font-bold text-ink">Request Sent!</h2>
				<p className="text-sm text-ink-3 leading-relaxed">
					Your join request for <span className="font-semibold text-ink">{orgName}</span> has been submitted.
					Your admin will approve your access shortly.
				</p>
			</div>
		);
	}

	return (
		<div className="glass rounded-2xl p-8 space-y-6">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-xl bg-mint/15 flex items-center justify-center">
					<Users className="w-5 h-5 text-mint" />
				</div>
				<div>
					<h1 className="text-xl font-bold text-ink">Join Your Team</h1>
					<p className="text-xs text-ink-3 mt-0.5">Enter the join code shared by your admin</p>
				</div>
			</div>

			{step === "code" ? (
				<form onSubmit={checkCode} className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="code">Organisation Join Code</Label>
						<Input
							id="code"
							placeholder="Ask your admin for this code"
							value={code}
							onChange={(e) => setCode(e.target.value)}
							required
						/>
					</div>

					{error && (
						<p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
					)}

					<Button type="submit" className="w-full gap-2" isLoading={loading}>
						Continue <ArrowRight className="w-4 h-4" />
					</Button>
				</form>
			) : (
				<form onSubmit={handleJoin} className="space-y-4">
					<div className="rounded-lg bg-mint/10 border border-mint/30 px-3 py-2 text-sm">
						Joining: <span className="font-semibold text-ink">{orgName}</span>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="name">Full Name</Label>
						<Input
							id="name"
							placeholder="John Doe"
							value={form.name}
							onChange={(e) => setField("name", e.target.value)}
							required
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="email">Work Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@company.com"
							value={form.email}
							onChange={(e) => setField("email", e.target.value)}
							required
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							type="password"
							placeholder="Minimum 8 characters"
							value={form.password}
							onChange={(e) => setField("password", e.target.value)}
							required
							minLength={8}
						/>
					</div>

					<div className="space-y-2.5 pt-1">
						<label className="flex items-start gap-2.5 cursor-pointer">
							<Checkbox
								checked={acceptedPrivacy}
								onCheckedChange={setAcceptedPrivacy}
								className="mt-0.5"
							/>
							<span className="text-xs text-ink-3 leading-relaxed">
								I agree to the{" "}
								<a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-mint hover:underline">
									Privacy Policy
								</a>
							</span>
						</label>
						<label className="flex items-start gap-2.5 cursor-pointer">
							<Checkbox
								checked={acceptedTerms}
								onCheckedChange={setAcceptedTerms}
								className="mt-0.5"
							/>
							<span className="text-xs text-ink-3 leading-relaxed">
								I agree to the{" "}
								<a href="/terms" target="_blank" rel="noopener noreferrer" className="text-mint hover:underline">
									Terms of Service
								</a>
							</span>
						</label>
					</div>

					{error && (
						<p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
					)}

					<div className="flex gap-2">
						<Button type="button" variant="ghost" className="flex-1" onClick={() => { setStep("code"); setError(""); }}>
							Back
						</Button>
						<Button type="submit" className="flex-1" isLoading={loading} disabled={!acceptedPrivacy || !acceptedTerms}>
							Request Access
						</Button>
					</div>
				</form>
			)}
		</div>
	);
}
