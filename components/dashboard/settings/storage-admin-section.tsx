"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { HardDrive, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Provider = "supabase" | "s3";

interface StorageSafe {
	provider: Provider;
	bucket: string;
	region?: string;
}

export function StorageAdminSection() {
	const [provider, setProvider] = useState<Provider>("supabase");
	// Supabase fields
	const [sbUrl, setSbUrl] = useState("");
	const [sbKey, setSbKey] = useState("");
	const [sbBucket, setSbBucket] = useState("");
	// S3 fields
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

	return (
		<div className="rounded-xl border bg-background p-6 space-y-5">
			<div className="flex items-center gap-3">
				<div className="w-8 h-8 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
					<HardDrive className="w-4 h-4 text-mint" />
				</div>
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h2 className="text-sm font-semibold text-ink">File Storage</h2>
						{isConfigured && (
							<span className="text-[10px] bg-mint/15 text-mint px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1">
								<CheckCircle2 className="w-2.5 h-2.5" /> Configured
							</span>
						)}
					</div>
					<p className="text-xs text-ink-3 mt-0.5">
						Configure cloud storage for thread attachments. All files uploaded by org members are stored here.
					</p>
				</div>
			</div>

			<div className="space-y-1.5 max-w-sm">
				<Label className="text-xs">Storage Provider</Label>
				<SelectRoot value={provider} onValueChange={(v) => setProvider(v as Provider)}>
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
				<div className="grid gap-3 max-w-sm">
					<div className="space-y-1.5">
						<Label className="text-xs">Project URL</Label>
						<Input
							value={sbUrl}
							onChange={(e) => setSbUrl(e.target.value)}
							placeholder="https://xxxx.supabase.co"
							className="h-9 text-sm"
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
							/>
							<button
								type="button"
								onClick={() => setShowKey((s) => !s)}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
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
						/>
						<p className="text-[10px] text-ink-3">The bucket must exist in Supabase Storage and be set to public.</p>
					</div>
				</div>
			)}

			{provider === "s3" && (
				<div className="grid gap-3 max-w-sm">
					<div className="space-y-1.5">
						<Label className="text-xs">Region</Label>
						<Input value={s3Region} onChange={(e) => setS3Region(e.target.value)} placeholder="ap-southeast-1" className="h-9 text-sm" />
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">Bucket Name</Label>
						<Input value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)} placeholder="my-tickworks-bucket" className="h-9 text-sm" />
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">Access Key ID</Label>
						<Input value={s3KeyId} onChange={(e) => setS3KeyId(e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE" className="h-9 text-sm" />
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
							/>
							<button
								type="button"
								onClick={() => setShowSecret((s) => !s)}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
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
					disabled={!canSave || testResult === "testing"}
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
					disabled={!canSave || isSaving}
					isLoading={isSaving}
				>
					Save Storage
				</Button>
			</div>
		</div>
	);
}
