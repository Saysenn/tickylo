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
import { Combobox } from "@/components/ui/combobox";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "PHP", "AUD", "CAD", "SGD", "JPY", "INR", "MYR", "IDR"];

const COUNTRY_CODES = [
	{ code: "+63", flag: "🇵🇭", name: "PH" },
	{ code: "+1",  flag: "🇺🇸", name: "US" },
	{ code: "+44", flag: "🇬🇧", name: "GB" },
	{ code: "+971", flag: "🇦🇪", name: "UAE" },
	{ code: "+61", flag: "🇦🇺", name: "AU" },
	{ code: "+64", flag: "🇳🇿", name: "NZ" },
	{ code: "+65", flag: "🇸🇬", name: "SG" },
	{ code: "+60", flag: "🇲🇾", name: "MY" },
	{ code: "+62", flag: "🇮🇩", name: "ID" },
	{ code: "+66", flag: "🇹🇭", name: "TH" },
	{ code: "+84", flag: "🇻🇳", name: "VN" },
	{ code: "+82", flag: "🇰🇷", name: "KR" },
	{ code: "+81", flag: "🇯🇵", name: "JP" },
	{ code: "+86", flag: "🇨🇳", name: "CN" },
	{ code: "+852", flag: "🇭🇰", name: "HK" },
	{ code: "+91", flag: "🇮🇳", name: "IN" },
	{ code: "+966", flag: "🇸🇦", name: "SA" },
	{ code: "+49", flag: "🇩🇪", name: "DE" },
	{ code: "+33", flag: "🇫🇷", name: "FR" },
	{ code: "+39", flag: "🇮🇹", name: "IT" },
	{ code: "+34", flag: "🇪🇸", name: "ES" },
	{ code: "+31", flag: "🇳🇱", name: "NL" },
	{ code: "+1-CA", flag: "🇨🇦", name: "CA" },
];

const PHONE_PLACEHOLDER: Record<string, string> = {
	"+63": "912 345 6789", "+1": "(555) 234-5678", "+1-CA": "(416) 234-5678",
	"+44": "7911 123456", "+61": "412 345 678", "+64": "21 123 4567",
	"+65": "8123 4567", "+60": "12-345 6789", "+62": "812-3456-789",
	"+66": "81 234 5678", "+84": "91 234 56 78", "+82": "10-1234-5678",
	"+81": "90-1234-5678", "+86": "131 2345 6789", "+852": "5123 4567",
	"+91": "98765 43210", "+971": "50 123 4567", "+966": "51 234 5678",
	"+49": "1512 3456789", "+33": "6 12 34 56 78", "+39": "312 345 6789",
	"+34": "612 345 678", "+31": "6 12345678",
};

function parsePhone(raw: string): { dialCode: string; local: string } {
	for (const c of COUNTRY_CODES) {
		const code = c.code.replace("-CA", "");
		if (raw.startsWith(code)) return { dialCode: c.code, local: raw.slice(code.length).trim() };
	}
	return { dialCode: "+63", local: raw };
}

const RATE_TYPES = [
	{ value: "hourly", label: "Hourly rate" },
	{ value: "fixed",  label: "Fixed rate" },
	{ value: "none",   label: "No rate" },
] as const;

type RateType = "hourly" | "fixed" | "none";

export interface ClientFormData {
	name: string;
	email?: string;
	phone?: string;
	currency?: string;
	rate_type?: RateType;
	hourly_rate?: number;
	discount_percent?: number;
}

interface Client {
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	currency: string;
	rate_type: string;
	hourly_rate: number;
	discount_percent: number;
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
	const [dialCode, setDialCode] = useState("+63");
	const [localPhone, setLocalPhone] = useState("");
	const [currency, setCurrency] = useState("USD");
	const [rateType, setRateType] = useState<RateType>("hourly");
	const [rate, setRate] = useState("");
	const [discountPercent, setDiscountPercent] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		if (open) {
			setName(client?.name ?? "");
			setEmail(client?.email ?? "");
			const parsed = parsePhone(client?.phone ?? "");
			setDialCode(parsed.dialCode);
			setLocalPhone(parsed.local);
			setCurrency(client?.currency ?? "USD");
			setRateType((client?.rate_type as RateType) ?? "hourly");
			setRate(client?.hourly_rate != null && client.hourly_rate > 0 ? String(client.hourly_rate) : "");
			setDiscountPercent(client?.discount_percent != null && client.discount_percent > 0 ? String(client.discount_percent) : "");
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
				phone: localPhone.trim() ? `${dialCode.replace("-CA", "")}${localPhone.trim()}` : undefined,
				currency: currency || "USD",
				rate_type: rateType,
				hourly_rate: rateType !== "none" && rate ? parseFloat(rate) : undefined,
				discount_percent: discountPercent ? parseFloat(discountPercent) : undefined,
			});
			setOpen(false);
		} catch (err: any) {
			setError(err?.response?.data?.error ?? "Something went wrong.");
		}
	};

	const rateLabel = rateType === "fixed" ? "Fixed Rate" : "Hourly Rate";

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

					<div className="space-y-1.5">
						<Label htmlFor="client-phone">
							Phone <span className="text-[10px] font-normal text-ink-3/50">optional</span>
						</Label>
						<div className="flex gap-1.5">
							<Combobox
								options={COUNTRY_CODES.map((c) => ({
									value: c.code,
									label: `${c.flag} ${c.name} ${c.code.replace("-CA", "")}`,
								}))}
								value={dialCode}
								onChange={setDialCode}
								placeholder="+63"
								searchPlaceholder="Search country…"
								emptyText="No country found."
								className="w-36 shrink-0"
							/>
							<Input
								id="client-phone"
								type="tel"
								placeholder={PHONE_PLACEHOLDER[dialCode] ?? "Phone number"}
								value={localPhone}
								onChange={(e) => setLocalPhone(e.target.value)}
								maxLength={20}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label>Currency</Label>
							<Combobox
								options={CURRENCIES.map((c) => ({ value: c, label: c }))}
								value={currency}
								onChange={setCurrency}
								placeholder="USD"
							/>
						</div>

						<div className="space-y-1.5">
							<Label>Rate Type</Label>
							<Combobox
								options={RATE_TYPES.map((r) => ({ value: r.value, label: r.label }))}
								value={rateType}
								onChange={(v) => setRateType(v as RateType)}
							/>
						</div>
					</div>

					{rateType !== "none" && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label htmlFor="client-rate">
									{rateLabel} <span className="text-[10px] font-normal text-ink-3/50">optional</span>
								</Label>
								<Input
									id="client-rate"
									type="number"
									min="0"
									step="0.01"
									value={rate}
									onChange={(e) => setRate(e.target.value)}
									placeholder="0.00"
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="discount-percent">
									Discount % <span className="text-[10px] font-normal text-ink-3/50">0–100</span>
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
						</div>
					)}

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
