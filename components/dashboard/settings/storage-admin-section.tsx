"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HardDrive, CheckCircle2, Loader2, Eye, EyeOff, Paperclip } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

type Provider = "supabase" | "s3";

interface StorageSafe {
	provider: Provider;
	bucket: string;
	region?: string;
}

export function StorageAdminSection() {
	const queryClient = useQueryClient();

	// ── Attachment toggle ──────────────────────────────────────────────────────
	const { data: orgSettings } = useQuery<{ attachments_enabled: boolean }>({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 60_000,
	});
	const [attachEnabled, setAttachEnabled] = useState(true);
	useEffect(() => {
		if (orgSettings != null) setAttachEnabled(orgSettings.attachments_enabled);
	}, [orgSettings]);

	const { mutate: saveAttachToggle, isPending: isTogglingAttach } = useMutation({
		mutationFn: (enabled: boolean) => APIService.orgSettings.update({ attachments_enabled: enabled }),
		onSuccess: (_, enabled) => {
			setAttachEnabled(enabled);
			queryClient.invalidateQueries({ queryKey: ["org-settings"] });
		},
	});

	const handleToggle = () => {
		const next = !attachEnabled;
		saveAttachToggle(next);
	};

	// ── Storage config ─────────────────────────────────────────────────────────
	const [provider, setProvider] = useState<Provider>("supabase");
	const [sbUrl, setSbUrl] = useState("");
	const [sbKey, setSbKey] = useState("");
	const [sbBucket, setSbBucket] = useState("");
	const [s3Region, setS3Region] = useState("");
	const [s3Bucket, setS3Bucket] = useState("");
	const [s3KeyId, setS3KeyId] = useState("");
	const [s3Secret, setS3Secret] = useState("");

	const [showKey, setShowKey] = useState(false);
	const [showSecret, setShowSecret] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");
	const [testResult, setTestResult] = useState<"idle" | "testing" | "ok" | "fail">("idle");
	const [testError, setTestError] = useState("");

	const { data: existing } = useQuery<StorageSafe | null>({
		queryKey: ["org-storage"],
		queryFn: () => APIService.orgStorage.get(),
		staleTime: 600_000,
	});

	useEffect(() => {
		if (existing) {
			setProvider(existing.provider);
			if (existing.bucket) setSbBucket(existing.bucket);
			if (existing.bucket && existing.provider === "s3") setS3Bucket(existing.bucket);
			if (existing.region) setS3Region(existing.region);
		}
	}, [existing]);

	const buildPayload = () => {
		if (provider === "supabase") {
			return { provider: "supabase" as const, url: sbUrl, service_key: sbKey, bucket: sbBucket };
		}
		return { provider: "s3" as const, region: s3Region, bucket: s3Bucket, access_key_id: s3KeyId, secret_access_key: s3Secret };
	};

	const { mutate: save, isPending: isSaving } = useMutation({
		mutationFn: () => APIService.orgStorage.update(buildPayload()),
		onSuccess: () => { setSuccess(true); setError(""); setTimeout(() => setSuccess(false), 3000); },
		onError: (err: any) => setError(err?.response?.data?.error ?? "Failed to save."),
	});

	const handleTest = async () => {
		setTestResult("testing");
		setTestError("");
		try {
			await APIService.orgStorage.test(buildPayload());
			setTestResult("ok");
		} catch (err: any) {
			setTestResult("fail");
			setTestError(err?.response?.data?.error ?? "Connection test failed.");
		}
	};

	const isSupabaseComplete = provider === "supabase" && sbUrl && sbKey && sbBucket;
	const isS3Complete = provider === "s3" && s3Region && s3Bucket && s3KeyId && s3Secret;
	const canSave = isSupabaseComplete || isS3Complete;
	const isConfigured = !!existing;
	const formDisabled = !attachEnabled;

	return (
		<div className="rounded-xl border bg-background p-6 space-y-5">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="w-7 h-7 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
					<HardDrive className="w-3.5 h-3.5 text-mint" />
				</div>
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h2 className="text-xs font-semibold text-ink">File Storage</h2>
						{isConfigured && (
							<span className="text-[10px] bg-mint/15 text-mint px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
								<CheckCircle2 className="w-2.5 h-2.5" /> Configured
							</span>
						)}
					</div>
					<p className="text-[11px] text-ink-3 mt-0.5">
						Configure cloud storage for thread attachments. All files uploaded by org members are stored here.
					</p>
				</div>
			</div>

			{/* Attachment toggle */}
			<div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
				<div className="flex items-center gap-2.5">
					<Paperclip className="w-4 h-4 text-ink-3 shrink-0" />
					<div>
						<p className="text-sm font-medium text-ink">Thread attachments</p>
						<p className="text-xs text-ink-3">Allow members to attach files and images to comments.</p>
					</div>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={attachEnabled}
					disabled={isTogglingAttach}
					onClick={handleToggle}
					className={cn(
						"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint",
						attachEnabled ? "bg-mint" : "bg-accent",
						isTogglingAttach && "opacity-50 cursor-not-allowed",
					)}
				>
					<span
						className={cn(
							"pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
							attachEnabled ? "translate-x-4" : "translate-x-0",
						)}
					/>
				</button>
			</div>

			{/* Storage form — grayed out when attachments disabled */}
			<div className={cn("space-y-4 transition-opacity", formDisabled && "opacity-40 pointer-events-none select-none")}>
				{formDisabled && (
					<p className="text-xs text-ink-3 italic">Enable thread attachments above to configure storage.</p>
				)}

				<div className="space-y-1.5 max-w-md">
					<Label className="text-xs">Storage Provider</Label>
					<SelectRoot value={provider} onValueChange={(v) => setProvider(v as Provider)} disabled={formDisabled}>
						<SelectTrigger className="h-9 text-sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="supabase">Supabase Storage (recommended)</SelectItem>
							<SelectItem value="s3">AWS S3</SelectItem>
						</SelectContent>
					</SelectRoot>
				</div>

				{provider === "supabase" && (
					<div className="grid gap-3 max-w-md">
						<div className="space-y-1.5">
							<Label className="text-xs">Project URL</Label>
							<Input
								value={sbUrl}
								onChange={(e) => setSbUrl(e.target.value)}
								placeholder="https://xxxx.supabase.co"
								className="h-9 text-sm"
								disabled={formDisabled}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Service Role Key</Label>
							<div className="relative">
								<Input
									type={showKey ? "text" : "password"}
									value={sbKey}
									onChange={(e) => setSbKey(e.target.value)}
									placeholder="eyJhbGciOiJIUzI1NiIs…"
									className="h-9 text-sm pr-9"
									disabled={formDisabled}
								/>
								<button
									type="button"
									onClick={() => setShowKey((s) => !s)}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
									disabled={formDisabled}
								>
									{showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
								</button>
							</div>
							<p className="text-[10px] text-ink-3">Found in Supabase → Project Settings → API → service_role key.</p>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Bucket Name</Label>
							<Input
								value={sbBucket}
								onChange={(e) => setSbBucket(e.target.value)}
								placeholder="tickworks-attachments"
								className="h-9 text-sm"
								disabled={formDisabled}
							/>
							<p className="text-[10px] text-ink-3">The bucket must exist in Supabase Storage and be set to public.</p>
						</div>
					</div>
				)}

				{provider === "s3" && (
					<div className="grid gap-3 max-w-md">
						<div className="space-y-1.5">
							<Label className="text-xs">Region</Label>
							<Input value={s3Region} onChange={(e) => setS3Region(e.target.value)} placeholder="ap-southeast-1" className="h-9 text-sm" disabled={formDisabled} />
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Bucket Name</Label>
							<Input value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)} placeholder="my-tickworks-bucket" className="h-9 text-sm" disabled={formDisabled} />
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Access Key ID</Label>
							<Input value={s3KeyId} onChange={(e) => setS3KeyId(e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE" className="h-9 text-sm" disabled={formDisabled} />
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">Secret Access Key</Label>
							<div className="relative">
								<Input
									type={showSecret ? "text" : "password"}
									value={s3Secret}
									onChange={(e) => setS3Secret(e.target.value)}
									placeholder="wJalrXUtnFEMI/K7MDENG/…"
									className="h-9 text-sm pr-9"
									disabled={formDisabled}
								/>
								<button
									type="button"
									onClick={() => setShowSecret((s) => !s)}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
									disabled={formDisabled}
								>
									{showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
								</button>
							</div>
						</div>
					</div>
				)}

				{testResult === "ok" && (
					<p className="text-xs text-mint flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Connection successful.</p>
				)}
				{testResult === "fail" && <p className="text-xs text-destructive">{testError || "Connection test failed."}</p>}
				{error && <p className="text-xs text-destructive">{error}</p>}
				{success && <p className="text-xs text-mint">Storage configuration saved.</p>}

				<div className="flex items-center gap-2">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={handleTest}
						disabled={formDisabled || !canSave || testResult === "testing"}
						className="h-8 text-xs"
					>
						{testResult === "testing" ? (
							<><Loader2 className="w-3 h-3 animate-spin mr-1" /> Testing…</>
						) : "Test Connection"}
					</Button>
					<Button
						size="sm"
						className="bg-mint hover:bg-mint/90 text-ink h-8 text-xs"
						onClick={() => save()}
						disabled={formDisabled || !canSave || isSaving}
						isLoading={isSaving}
					>
						Save Storage
					</Button>
				</div>
			</div>
		</div>
	);
}
