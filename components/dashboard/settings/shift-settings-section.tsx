"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import APIService from "@/lib/infra/api";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserMe {
	shift_start: string | null;
	shift_end: string | null;
}

export function ShiftSettingsSection({ isAdmin = false }: { isAdmin?: boolean }) {
	const queryClient = useQueryClient();

	const { data } = useQuery<UserMe>({
		queryKey: ["user-me-shift"],
		queryFn: () => APIService.users.getMe(),
		staleTime: 300_000,
	});

	const [shiftStart, setShiftStart] = useState("");
	const [shiftEnd, setShiftEnd] = useState("");
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (data) {
			setShiftStart(data.shift_start ?? "");
			setShiftEnd(data.shift_end ?? "");
		}
	}, [data]);

	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			APIService.users.updateShift(shiftStart || null, shiftEnd || null),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user-me-shift"] });
			setSuccess(true);
			setError("");
			setTimeout(() => setSuccess(false), 3000);
		},
		onError: () => setError("Failed to save. Please try again."),
	});

	const isOvernightPreview = shiftStart && shiftEnd && shiftEnd <= shiftStart;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
						<Clock className="w-3.5 h-3.5 text-ink-2" />
					</div>
					<div>
						<CardTitle className="text-sm">{isAdmin ? "Default Shift Hours" : "My Shift Hours"}</CardTitle>
						<CardDescription className="text-xs">
							{isAdmin
								? "Set the organization's default shift. All employees without a personal shift will follow this schedule."
								: "Set your preferred shift. Leave blank to follow the organization's default schedule."}
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-1.5">
						<Label className="text-xs">Shift Start</Label>
						<Input
							type="time"
							value={shiftStart}
							onChange={(e) => setShiftStart(e.target.value)}
							className="h-9 text-sm"
						/>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs">Shift End</Label>
						<Input
							type="time"
							value={shiftEnd}
							onChange={(e) => setShiftEnd(e.target.value)}
							className="h-9 text-sm"
						/>
					</div>
				</div>

				{isOvernightPreview && (
					<p className="text-[11px] text-mint">
						Overnight shift detected — your timer will auto-close at {shiftEnd}{" "}
						the next day.
					</p>
				)}

				<p className="text-[11px] text-ink-3">
					{isAdmin
						? "Employees' active timers will be automatically stopped at shift end. Individual shift overrides take priority."
						: "Your active timer will be automatically stopped at your shift end. If both fields are blank, the org-wide schedule applies."}
				</p>

				{error && <p className="text-xs text-destructive">{error}</p>}
				{success && <p className="text-xs text-mint">Shift saved.</p>}

				<div className="flex items-center gap-3">
					<Button size="sm" onClick={() => mutate()} isLoading={isPending}>
						Save Shift
					</Button>
					{(shiftStart || shiftEnd) && (
						<Button
							size="sm"
							variant="ghost"
							className="text-ink-3 text-xs"
							onClick={() => {
								setShiftStart("");
								setShiftEnd("");
							}}
						>
							Clear (use org default)
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
