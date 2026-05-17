"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { Download, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import APIService from "@/lib/infra/api";

export function OrgJoinQrSection() {
	const [copied, setCopied] = useState(false);
	const qrRef = useRef<HTMLDivElement>(null);

	const { data } = useQuery({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 300_000,
	});

	const joinUrl = data?.org_join_code
		? `${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${data.org_join_code}`
		: null;

	function copyLink() {
		if (!joinUrl) return;
		navigator.clipboard.writeText(joinUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	async function share() {
		if (!joinUrl) return;
		if (navigator.share) {
			await navigator.share({ title: "Join our team on Tickworks", url: joinUrl });
		} else {
			copyLink();
		}
	}

	function download() {
		const svg = qrRef.current?.querySelector("svg");
		if (!svg) return;

		const svgData = new XMLSerializer().serializeToString(svg);
		const canvas  = document.createElement("canvas");
		const size    = 256;
		canvas.width  = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d")!;
		const img = new Image();
		img.onload = () => {
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, size, size);
			ctx.drawImage(img, 0, 0, size, size);
			const a = document.createElement("a");
			a.download = "tickworks-join-qr.png";
			a.href = canvas.toDataURL("image/png");
			a.click();
		};
		img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
	}

	if (!joinUrl) return null;

	return (
		<section className="rounded-lg border bg-background p-6 space-y-5">
			<div>
				<h2 className="font-semibold text-ink">Join QR Code</h2>
				<p className="text-xs text-ink-3 mt-0.5">Share this QR or link so employees can scan and join your org instantly.</p>
			</div>

			<div className="flex flex-col sm:flex-row items-start gap-6">
				{/* QR code */}
				<div ref={qrRef} className="p-3 rounded-xl border bg-white shrink-0">
					<QRCode value={joinUrl} size={148} />
				</div>

				{/* Link + actions */}
				<div className="flex-1 min-w-0 space-y-4">
					<div className="space-y-1.5">
						<p className="text-xs font-medium text-ink-3">Join Link</p>
						<div className="flex items-center gap-2">
							<p className="text-sm text-ink bg-accent rounded-md px-3 py-1.5 flex-1 min-w-0 truncate font-mono">
								{joinUrl}
							</p>
							<Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={copyLink}>
								{copied ? <Check className="w-3.5 h-3.5 text-mint" /> : <Copy className="w-3.5 h-3.5" />}
								{copied ? "Copied" : "Copy"}
							</Button>
						</div>
					</div>

					<p className="text-xs text-ink-3 leading-relaxed">
						Employees scan the QR or open the link — the join code is pre-filled automatically.
					</p>

					<div className="flex gap-2 flex-wrap">
						<Button size="sm" className="gap-1.5 bg-mint hover:bg-mint/90 text-ink" onClick={share}>
							<Share2 className="w-3.5 h-3.5" />
							Share Link
						</Button>
						<Button size="sm" variant="outline" className="gap-1.5" onClick={download}>
							<Download className="w-3.5 h-3.5" />
							Download QR
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
