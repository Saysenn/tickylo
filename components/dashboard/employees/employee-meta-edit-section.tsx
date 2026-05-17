"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { formatDate, toDateInput } from "@/lib/utils/format";

interface Meta {
	phone: string | null;
	dob: string | null;
	address: string | null;
	passport_number: string | null;
	visa_status: string | null;
	visa_expiry: string | null;
	salary: number | null;
	date_joined: string | null;
	sick_leave: number | null;
	vacation_leave: number | null;
	emergency_leave: number | null;
	personal_leave: number | null;
}

interface Props {
	employeeId: string;
	initialMeta: Meta | null;
}

const COUNTRY_CODES = [
	{ code: "+63", flag: "🇵🇭", name: "PH" },
	{ code: "+1",  flag: "🇺🇸", name: "US" },
	{ code: "+44", flag: "🇬🇧", name: "GB" },
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
	{ code: "+971", flag: "🇦🇪", name: "UAE" },
	{ code: "+966", flag: "🇸🇦", name: "SA" },
	{ code: "+49", flag: "🇩🇪", name: "DE" },
	{ code: "+33", flag: "🇫🇷", name: "FR" },
	{ code: "+39", flag: "🇮🇹", name: "IT" },
	{ code: "+34", flag: "🇪🇸", name: "ES" },
	{ code: "+31", flag: "🇳🇱", name: "NL" },
	{ code: "+1-CA", flag: "🇨🇦", name: "CA" },
];

const PHONE_PLACEHOLDER: Record<string, string> = {
	"+63":    "912 345 6789",
	"+1":     "(555) 234-5678",
	"+1-CA":  "(416) 234-5678",
	"+44":    "7911 123456",
	"+61":    "412 345 678",
	"+64":    "21 123 4567",
	"+65":    "8123 4567",
	"+60":    "12-345 6789",
	"+62":    "812-3456-789",
	"+66":    "81 234 5678",
	"+84":    "91 234 56 78",
	"+82":    "10-1234-5678",
	"+81":    "90-1234-5678",
	"+86":    "131 2345 6789",
	"+852":   "5123 4567",
	"+91":    "98765 43210",
	"+971":   "50 123 4567",
	"+966":   "51 234 5678",
	"+49":    "1512 3456789",
	"+33":    "6 12 34 56 78",
	"+39":    "312 345 6789",
	"+34":    "612 345 678",
	"+31":    "6 12345678",
};

function parsePhone(raw: string): { dialCode: string; local: string } {
	for (const c of COUNTRY_CODES) {
		const code = c.code.replace("-CA", "");
		if (raw.startsWith(code)) return { dialCode: c.code, local: raw.slice(code.length).trim() };
	}
	return { dialCode: "+63", local: raw };
}

export function EmployeeMetaEditSection({ employeeId, initialMeta }: Props) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const m = initialMeta;

	const parsed = parsePhone(m?.phone ?? "");
	const [dialCode, setDialCode] = useState(parsed.dialCode);
	const [localPhone, setLocalPhone] = useState(parsed.local);
	const [dob, setDob] = useState(toDateInput(m?.dob));
	const [address, setAddress] = useState(m?.address ?? "");
	const [dateJoined, setDateJoined] = useState(toDateInput(m?.date_joined));

	const fullPhone = localPhone ? `${dialCode.replace("-CA", "")}${localPhone}` : null;

	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			APIService.employees.updateMeta(employeeId, {
				phone: fullPhone,
				dob: dob || null,
				address: address || null,
				passport_number: null,
				visa_status: null,
				visa_expiry: null,
				salary: null,
				date_joined: dateJoined || null,
				sick_leave: null,
				vacation_leave: null,
				emergency_leave: null,
				personal_leave: null,
			}),
		onSuccess: () => {
			setEditing(false);
			setError(null);
			router.refresh();
		},
		onError: () => setError("Failed to save. Please try again."),
	});

	// ── View mode ─────────────────────────────────────────────────────────────
	if (!editing) {
		const fields = [
			{ label: "Phone", value: m?.phone },
			{ label: "Date of birth", value: m?.dob ? formatDate(m.dob) : null },
			{ label: "Date joined", value: m?.date_joined ? formatDate(m.date_joined) : null },
			{ label: "Address", value: m?.address },
		];

		return (
			<section className="rounded-lg border bg-background p-6 space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-ink">Details</h2>
					<Button
						size="sm"
						variant="ghost"
						className="h-8 gap-1.5 text-ink-3"
						onClick={() => setEditing(true)}
					>
						<Pencil className="w-3.5 h-3.5" />
						Edit
					</Button>
				</div>

				{m ? (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
						{fields.map(({ label, value }) => (
							<div key={label}>
								<p className="text-xs text-ink-3 mb-0.5">{label}</p>
								<p className="font-medium text-ink">{value ?? "—"}</p>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-ink-3">No details added yet.</p>
				)}
			</section>
		);
	}

	// ── Edit mode ─────────────────────────────────────────────────────────────
	return (
		<section className="rounded-lg border bg-background p-6 space-y-5">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-ink">Edit Details</h2>
				<Button
					size="sm"
					variant="ghost"
					className="h-8 gap-1.5 text-ink-3"
					onClick={() => { setEditing(false); setError(null); }}
					disabled={isPending}
				>
					<X className="w-3.5 h-3.5" />
					Cancel
				</Button>
			</div>

			<div className="space-y-4">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="space-y-1.5">
						<Label htmlFor="emp-phone">Phone</Label>
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
								id="emp-phone"
								type="tel"
								placeholder={PHONE_PLACEHOLDER[dialCode] ?? "Phone number"}
								value={localPhone}
								onChange={(e) => setLocalPhone(e.target.value)}
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="emp-dob">Date of Birth</Label>
						<Input
							id="emp-dob"
							type="date"
							value={dob}
							onChange={(e) => setDob(e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="emp-date-joined">Date Joined</Label>
						<Input
							id="emp-date-joined"
							type="date"
							value={dateJoined}
							onChange={(e) => setDateJoined(e.target.value)}
						/>
					</div>
				</div>

				{/* Address — full width */}
				<div className="space-y-1.5">
					<Label htmlFor="emp-address">Address</Label>
					<Input
						id="emp-address"
						type="text"
						placeholder="123 Main St, City, Country"
						value={address}
						onChange={(e) => setAddress(e.target.value)}
					/>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-3 pt-1">
					<Button size="sm" onClick={() => mutate()} disabled={isPending}>
						{isPending ? (
							<>
								<div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
								Saving…
							</>
						) : (
							"Save Changes"
						)}
					</Button>
					{error && <p className="text-sm text-destructive">{error}</p>}
				</div>
			</div>
		</section>
	);
}
