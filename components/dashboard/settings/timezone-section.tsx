"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TIMEZONES } from "@/lib/utils/format";

interface UserMe {
	id: string;
	name: string | null;
	email: string;
	timezone: string | null;
}

export function TimezoneSection() {
	const queryClient = useQueryClient();
	const { data, isLoading } = useQuery<UserMe | null>({
		queryKey: ["user-me"],
		queryFn: () => APIService.users.me(),
	});

	const [timezone, setTimezone] = useState("UTC");
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (data?.timezone) setTimezone(data.timezone);
	}, [data]);

	const { mutate, isPending } = useMutation({
		mutationFn: () => APIService.users.updateTimezone(timezone),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user-me"] });
			setSuccess(true);
			setError("");
			setTimeout(() => setSuccess(false), 3000);
		},
		onError: () => setError("Failed to save. Please try again."),
	});

	if (isLoading) return (
		<div className="rounded-xl border p-6">
			<div className="w-4 h-4 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
		</div>
	);

	return (
		<div className="rounded-xl border bg-background p-6 space-y-4">
			<div className="flex items-center gap-3">
				<div className="w-8 h-8 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
					<Globe className="w-4 h-4 text-mint" />
				</div>
				<div>
					<h2 className="text-sm font-semibold text-ink">Your Timezone</h2>
					<p className="text-xs text-ink-3 mt-0.5">Used to display times in your local timezone.</p>
				</div>
			</div>

			<div className="space-y-1.5 max-w-xs">
				<Label className="text-xs">Display Timezone</Label>
				<SelectRoot value={timezone} onValueChange={setTimezone}>
					<SelectTrigger className="h-9 text-sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TIMEZONES.map((tz) => (
							<SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
						))}
					</SelectContent>
				</SelectRoot>
			</div>

			{error && <p className="text-xs text-destructive">{error}</p>}
			{success && <p className="text-xs text-mint">Timezone saved.</p>}

			<Button
				size="sm"
				className="bg-mint hover:bg-mint/90 text-ink"
				onClick={() => mutate()}
				disabled={isPending}
				isLoading={isPending}
			>
				Save Timezone
			</Button>
		</div>
	);
}
