"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Provider = "supabase" | "s3";

interface StorageSafe {
	provider: Provider;
	bucket:   string;
	region?:  string;
}

export function StorageConfigForm() {
	const [provider,    setProvider]    = useState<Provider>("supabase");
	const [sbUrl,       setSbUrl]       = useState("");
	const [sbKey,       setSbKey]       = useState("");
	const [sbBucket,    setSbBucket]    = useState("");
	const [s3Region,    setS3Region]    = useState("");
	const [s3Bucket,    setS3Bucket]    = useState("");
	const [s3KeyId,     setS3KeyId]     = useState("");
	const [s3Secret,    setS3Secret]    = useState("");
	const [showKey,     setShowKey]     = useState(false);
	const [showSecret,  setShowSecret]  = useState(false);
	const [success,     setSuccess]     = useState(false);
	const [error,       setError]       = useState("");
	const [testResult,  setTestResult]  = useState<"idle" | "testing" | "ok" | "fail">("idle");
	const [testError,   setTestError]   = useState("");

	const { data: existing } = useQuery<StorageSafe | null>({
		queryKey: ["org-storage"],
		queryFn:  () => APIService.orgStorage.get(),
		staleTime: 600_000,
	});

	useEffect(() => {
		if (!existing) return;
		setProvider(existing.provider);
		if (existing.bucket) {
			setSbBucket(existing.bucket);
			if (existing.provider === "s3") setS3Bucket(existing.bucket);
		}
		if (existing.region) setS3Region(existing.region);
	}, [existing]);

	const buildPayload = () => provider === "supabase"
		? { provider: "supabase" as const, url: sbUrl, service_key: sbKey, bucket: sbBucket }
		: { provider: "s3" as const, region: s3Region, bucket: s3Bucket, access_key_id: s3KeyId, secret_access_key: s3Secret };

	const { mutate: save, isPending: isSaving } = useMutation({
		mutationFn: () => APIService.orgStorage.update(buildPayload()),
		onSuccess: () => { setSuccess(true); setError(""); setTimeout(() => setSuccess(false), 3000); },
		onError:   (err: any) => setError(err?.response?.data?.error ?? "Failed to save."),
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

	const isConfigured       = !!existing;
	const isSupabaseComplete = provider === "supabase" && sbUrl && sbKey && sbBucket;
	const isS3Complete       = provider === "s3" && s3Region && s3Bucket && s3KeyId && s3Secret;
	const canSave            = isSupabaseComplete || isS3Complete;

	return (
		<div className="space-y-4">
			{isConfigured && (
				<p className="text-xs text-mint flex items-center gap-1">
					<CheckCircle2 className="w-3.5 h-3.5" /> Storage configured
				</p>
			)}

			<div className="space-y-1.5 max-w-md">
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
				<div className="grid gap-3 max-w-md">
					<div className="space-y-1.5">
						<Label className="text-xs">Project URL</Label>
						<Input value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} placeholder="https://xxxx.supabase.co" className="h-9 text-sm" />
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
							<button type="button" onClick={() => setShowKey((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
								{showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
							</button>
						</div>
						<p className="text-[10px] text-ink-3">Found in Supabase → Project Settings → API → service_role key.</p>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">Bucket Name</Label>
						<Input value={sbBucket} onChange={(e) => setSbBucket(e.target.value)} placeholder="tickylo-attachments" className="h-9 text-sm" />
						<p className="text-[10px] text-ink-3">The bucket must exist in Supabase Storage and be set to public.</p>
					</div>
				</div>
			)}

			{provider === "s3" && (
				<div className="grid gap-3 max-w-md">
					<div className="space-y-1.5">
						<Label className="text-xs">Region</Label>
						<Input value={s3Region} onChange={(e) => setS3Region(e.target.value)} placeholder="ap-southeast-1" className="h-9 text-sm" />
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">Bucket Name</Label>
						<Input value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)} placeholder="my-tickylo-bucket" className="h-9 text-sm" />
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
							<button type="button" onClick={() => setShowSecret((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
								{showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
							</button>
						</div>
					</div>
				</div>
			)}

			{testResult === "ok"   && <p className="text-xs text-mint flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Connection successful.</p>}
			{testResult === "fail" && <p className="text-xs text-destructive">{testError || "Connection test failed."}</p>}
			{error   && <p className="text-xs text-destructive">{error}</p>}
			{success && <p className="text-xs text-mint">Storage configuration saved.</p>}

			<div className="flex items-center gap-2">
				<Button type="button" size="sm" variant="outline" onClick={handleTest} disabled={!canSave || testResult === "testing"} className="h-8 text-xs">
					{testResult === "testing" ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Testing…</> : "Test Connection"}
				</Button>
				<Button size="sm" className="bg-mint hover:bg-mint/90 text-ink h-8 text-xs" onClick={() => save()} disabled={!canSave || isSaving} isLoading={isSaving}>
					Save Storage
				</Button>
			</div>
		</div>
	);
}
