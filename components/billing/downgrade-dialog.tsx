"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Search, UserMinus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import APIService from "@/lib/infra/api";

interface Props {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	activeCount: number;          // total active employees (excl. admin)
	onSuccess: () => void;
}

export function DowngradeDialog({ open, onOpenChange, activeCount, onSuccess }: Props) {
	const [seatCount, setSeatCount]   = useState(Math.max(1, activeCount));
	const [search, setSearch]         = useState("");
	const [selected, setSelected]     = useState<Set<string>>(new Set());
	const [error, setError]           = useState<string | null>(null);
	const [step, setStep]             = useState<"seats" | "picker" | "confirm">("seats");

	const needsPicker = activeCount > seatCount;

	// Fetch employees only when picker step is active
	const { data: empData, isLoading: loadingEmps } = useQuery({
		queryKey: ["employees-for-downgrade"],
		queryFn:  () => APIService.employees.list(1, 500, ""),
		enabled:  open && step === "picker",
		staleTime: 30_000,
	});

	const employees: { id: string; name: string | null; email: string; role: string | null }[] =
		(empData as any)?.data?.data ?? [];

	const filtered = useMemo(() =>
		employees.filter((e) =>
			!search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
		),
		[employees, search]
	);

	const toggle = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else if (next.size < seatCount) {
				next.add(id);
			}
			return next;
		});
	};

	const { mutate: doDowngrade, isPending } = useMutation({
		mutationFn: () => APIService.billing.downgrade(
			seatCount,
			needsPicker ? Array.from(selected) : undefined,
		),
		onSuccess: () => { onOpenChange(false); onSuccess(); },
		onError:   (err: any) => setError(err?.response?.data?.error ?? "Downgrade failed. Please try again."),
	});

	const reset = () => {
		setStep("seats");
		setSearch("");
		setSelected(new Set());
		setError(null);
		setSeatCount(Math.max(1, activeCount));
	};

	const handleNext = () => {
		if (step === "seats") {
			if (needsPicker) { setStep("picker"); } else { setStep("confirm"); }
		} else if (step === "picker") {
			if (selected.size !== seatCount) {
				setError(`Select exactly ${seatCount} employee${seatCount !== 1 ? "s" : ""} to keep.`);
				return;
			}
			setError(null);
			setStep("confirm");
		}
	};

	const deactivateCount = needsPicker ? activeCount - seatCount : 0;

	return (
		<Dialog.Root open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
					<Dialog.Title className="sr-only">Downgrade to Business</Dialog.Title>

					<button
						onClick={() => { reset(); onOpenChange(false); }}
						className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-accent transition-colors"
					>
						<X className="w-4 h-4" />
					</button>

					<h2 className="text-base font-bold text-ink mb-1">Change to Business Plan</h2>
					<p className="text-sm text-ink-3 mb-5">
						$20/mo + $4.99/seat/mo · Changes are prorated automatically.
					</p>

					{/* Step 1 — choose seat count */}
					{step === "seats" && (
						<div className="space-y-5">
							<div>
								<p className="text-sm font-medium text-ink mb-2">How many seats do you need?</p>
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setSeatCount((c) => Math.max(1, c - 1))}
											className="w-8 h-8 rounded border border-border text-ink-3 hover:text-ink hover:bg-accent transition-colors text-lg font-medium"
										>
											−
										</button>
										<span className="w-12 text-center font-semibold text-ink">{seatCount}</span>
										<button
											type="button"
											onClick={() => setSeatCount((c) => Math.min(500, c + 1))}
											className="w-8 h-8 rounded border border-border text-ink-3 hover:text-ink hover:bg-accent transition-colors text-lg font-medium"
										>
											+
										</button>
									</div>
									<span className="text-xs text-ink-3">
										${(20 + seatCount * 4.99).toFixed(2)}/mo total
									</span>
								</div>
							</div>

							{needsPicker && (
								<div className="flex items-start gap-2.5 bg-warning/8 border border-warning/20 rounded-xl p-3">
									<AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
									<p className="text-xs text-warning-fg dark:text-warning">
										You have <strong>{activeCount}</strong> active employees but only <strong>{seatCount}</strong> seat{seatCount !== 1 ? "s" : ""}. You'll need to choose which <strong>{seatCount}</strong> to keep — the rest will be deactivated.
									</p>
								</div>
							)}

							<div className="flex gap-2 pt-1">
								<Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
								<Button className="flex-1" onClick={handleNext}>
									{needsPicker ? "Choose Seats →" : "Review →"}
								</Button>
							</div>
						</div>
					)}

					{/* Step 2 — pick employees to keep */}
					{step === "picker" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium text-ink">
									Select <strong>{seatCount}</strong> employee{seatCount !== 1 ? "s" : ""} to keep active
								</p>
								<span className="text-xs text-ink-3">{selected.size}/{seatCount} selected</span>
							</div>

							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
								<Input
									placeholder="Search employees…"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-8 h-8 text-sm"
								/>
							</div>

							<div className="max-h-60 overflow-y-auto rounded-lg border border-border divide-y divide-border">
								{loadingEmps ? (
									<div className="p-4 text-center text-sm text-ink-3">Loading…</div>
								) : filtered.length === 0 ? (
									<div className="p-4 text-center text-sm text-ink-3">No employees found</div>
								) : filtered.map((emp) => {
									const isSelected = selected.has(emp.id);
									const isDisabled = !isSelected && selected.size >= seatCount;
									return (
										<button
											key={emp.id}
											type="button"
											disabled={isDisabled}
											onClick={() => toggle(emp.id)}
											className={cn(
												"w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
												isSelected ? "bg-mint/8" : "hover:bg-accent",
												isDisabled && "opacity-40 cursor-not-allowed",
											)}
										>
											<div className={cn(
												"w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors",
												isSelected ? "bg-mint border-mint" : "border-border",
											)}>
												{isSelected && <span className="block w-2 h-2 rounded-sm bg-white" />}
											</div>
											<div className="min-w-0">
												<p className="text-sm font-medium text-ink truncate">{emp.name ?? emp.email}</p>
												{emp.name && <p className="text-xs text-ink-3 truncate">{emp.email}</p>}
											</div>
											<span className="ml-auto text-xs text-ink-3 capitalize shrink-0">{emp.role}</span>
										</button>
									);
								})}
							</div>

							{error && <p className="text-xs text-destructive">{error}</p>}

							<div className="flex gap-2">
								<Button variant="outline" className="flex-1" onClick={() => { setStep("seats"); setError(null); }}>Back</Button>
								<Button
									className="flex-1"
									disabled={selected.size !== seatCount}
									onClick={handleNext}
								>
									Review →
								</Button>
							</div>
						</div>
					)}

					{/* Step 3 — confirm */}
					{step === "confirm" && (
						<div className="space-y-4">
							<div className="rounded-xl border border-border divide-y divide-border">
								<div className="flex items-center justify-between px-4 py-3">
									<span className="text-sm text-ink-3">New plan</span>
									<span className="text-sm font-semibold text-ink">Business</span>
								</div>
								<div className="flex items-center justify-between px-4 py-3">
									<span className="text-sm text-ink-3">Seats</span>
									<span className="text-sm font-semibold text-ink">{seatCount}</span>
								</div>
								<div className="flex items-center justify-between px-4 py-3">
									<span className="text-sm text-ink-3">Monthly cost</span>
									<span className="text-sm font-semibold text-ink">${(20 + seatCount * 4.99).toFixed(2)}/mo</span>
								</div>
								{deactivateCount > 0 && (
									<div className="flex items-center justify-between px-4 py-3">
										<span className="text-sm text-ink-3">Employees deactivated</span>
										<span className="text-sm font-semibold text-destructive">{deactivateCount}</span>
									</div>
								)}
							</div>

							{deactivateCount > 0 && (
								<div className="flex items-start gap-2.5 bg-destructive/8 border border-destructive/20 rounded-xl p-3">
									<UserMinus className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
									<p className="text-xs text-destructive dark:text-destructive/80">
										{deactivateCount} employee{deactivateCount !== 1 ? "s" : ""} will lose access immediately. This cannot be undone without re-inviting them.
									</p>
								</div>
							)}

							{error && <p className="text-xs text-destructive">{error}</p>}

							<div className="flex gap-2">
								<Button
									variant="outline"
									className="flex-1"
									onClick={() => { setStep(needsPicker ? "picker" : "seats"); setError(null); }}
								>
									Back
								</Button>
								<Button
									className="flex-1 bg-destructive hover:bg-destructive/90"
									isLoading={isPending}
									onClick={() => doDowngrade()}
								>
									Confirm Downgrade
								</Button>
							</div>
						</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
