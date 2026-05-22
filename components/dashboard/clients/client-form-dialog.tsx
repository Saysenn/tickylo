"use client";

import { useEffect, useState } from "react";
import {
	DialogRoot,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	SelectRoot,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";

const CURRENCIES = ["USD", "EUR", "GBP", "PHP", "AUD", "CAD", "SGD", "JPY", "INR", "MYR", "IDR"];

export interface ClientFormData {
	name: string;
	email?: string;
	currency?: string;
	hourly_rate?: number;
	discount_percent?: number;
	notes?: string;
}

interface Client {
	id: string;
	name: string;
	email: string | null;
	currency: string;
	hourly_rate: number;
	discount_percent: number;
	notes: string | null;
}

interface Props {
	mode: "create" | "edit";
	client?: Client;
	trigger: React.ReactNode;
	onSubmit: (data: ClientFormData) => Promise<void>;
	isPending: boolean;
}

export function ClientFormDialog({ mode, client, trigger, onSubmit, isPending }: Props) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [currency, setCurrency] = useState("USD");
	const [hourlyRate, setHourlyRate] = useState("");
	const [discountPercent, setDiscountPercent] = useState("");
	const [notes, setNotes] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		if (open) {
			setName(client?.name ?? "");
			setEmail(client?.email ?? "");
			setCurrency(client?.currency ?? "USD");
			setHourlyRate(client?.hourly_rate != null ? String(client.hourly_rate) : "");
			setDiscountPercent(client?.discount_percent != null ? String(client.discount_percent) : "");
			setNotes(client?.notes ?? "");
			setError("");
		}
	}, [open, client]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		try {
			await onSubmit({
				name: name.trim(),
				email: email.trim() || undefined,
				currency: currency || "USD",
				hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
				discount_percent: discountPercent ? parseFloat(discountPercent) : undefined,
				notes: notes.trim() || undefined,
			});
			setOpen(false);
		} catch (err: any) {
			setError(err?.response?.data?.error ?? "Something went wrong.");
		}
	};

	return (
		<DialogRoot open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{mode === "create" ? "Add client" : "Edit client"}</DialogTitle>
					<DialogDescription>
						{mode === "create"
							? "Create a new client for billing and invoice generation."
							: "Update this client's billing details."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="client-name">Name</Label>
						<Input
							id="client-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Acme Corp"
							required
							minLength={1}
							maxLength={200}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="client-email">
							Email <span className="text-[10px] font-normal text-ink-3/50">optional</span>
						</Label>
						<Input
							id="client-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="e.g. billing@acme.com"
							maxLength={200}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label>Currency</Label>
							<SelectRoot value={currency} onValueChange={setCurrency}>
								<SelectTrigger>
									<SelectValue placeholder="USD" />
								</SelectTrigger>
								<SelectContent>
									{CURRENCIES.map((c) => (
										<SelectItem key={c} value={c}>{c}</SelectItem>
									))}
								</SelectContent>
							</SelectRoot>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="hourly-rate">
								Hourly Rate <span className="text-[10px] font-normal text-ink-3/50">optional</span>
							</Label>
							<Input
								id="hourly-rate"
								type="number"
								min="0"
								step="0.01"
								value={hourlyRate}
								onChange={(e) => setHourlyRate(e.target.value)}
								placeholder="0.00"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="discount-percent">
							Discount % <span className="text-[10px] font-normal text-ink-3/50">optional, 0–100</span>
						</Label>
						<Input
							id="discount-percent"
							type="number"
							min="0"
							max="100"
							step="0.01"
							value={discountPercent}
							onChange={(e) => setDiscountPercent(e.target.value)}
							placeholder="0"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="client-notes">
							Notes <span className="text-[10px] font-normal text-ink-3/50">optional</span>
						</Label>
						<textarea
							id="client-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Any relevant billing notes…"
							maxLength={2000}
							rows={3}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint placeholder:text-ink-3/40 resize-none"
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<div className="flex justify-end gap-2 pt-2">
						<DialogClose asChild>
							<Button type="button" variant="outline" size="sm">Cancel</Button>
						</DialogClose>
						<Button type="submit" size="sm" isLoading={isPending}>
							{mode === "create" ? "Create client" : "Save changes"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
