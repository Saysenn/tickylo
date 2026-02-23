"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import APIService from "@/lib/infra/api";
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
import { formatDate, toDateInput, toIntInput } from "@/lib/utils/format";

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

const VISA_STATUS_OPTIONS = [
	{ value: "valid", label: "Valid" },
	{ value: "expired", label: "Expired" },
	{ value: "pending", label: "Pending" },
	{ value: "not_applicable", label: "Not applicable" },
];

export function EmployeeMetaEditSection({ employeeId, initialMeta }: Props) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const m = initialMeta;
	const [phone, setPhone] = useState(m?.phone ?? "");
	const [dob, setDob] = useState(toDateInput(m?.dob));
	const [address, setAddress] = useState(m?.address ?? "");
	const [passport, setPassport] = useState(m?.passport_number ?? "");
	const [visaStatus, setVisaStatus] = useState(m?.visa_status ?? "");
	const [visaExpiry, setVisaExpiry] = useState(toDateInput(m?.visa_expiry));
	const [salary, setSalary] = useState(m?.salary != null ? String(m.salary) : "");
	const [dateJoined, setDateJoined] = useState(toDateInput(m?.date_joined));
	const [sickLeave, setSickLeave] = useState(toIntInput(m?.sick_leave ?? null));
	const [vacationLeave, setVacationLeave] = useState(toIntInput(m?.vacation_leave ?? null));
	const [emergencyLeave, setEmergencyLeave] = useState(toIntInput(m?.emergency_leave ?? null));
	const [personalLeave, setPersonalLeave] = useState(toIntInput(m?.personal_leave ?? null));

	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			APIService.employees.updateMeta(employeeId, {
				phone: phone || null,
				dob: dob || null,
				address: address || null,
				passport_number: passport || null,
				visa_status: visaStatus || null,
				visa_expiry: visaExpiry || null,
				salary: salary !== "" ? parseFloat(salary) : null,
				date_joined: dateJoined || null,
				sick_leave: sickLeave !== "" ? parseInt(sickLeave, 10) : null,
				vacation_leave: vacationLeave !== "" ? parseInt(vacationLeave, 10) : null,
				emergency_leave: emergencyLeave !== "" ? parseInt(emergencyLeave, 10) : null,
				personal_leave: personalLeave !== "" ? parseInt(personalLeave, 10) : null,
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
			{
				label: "Salary",
				value: m?.salary != null ? `$${m.salary.toLocaleString()}` : null,
			},
			{ label: "Visa status", value: m?.visa_status },
			{
				label: "Visa expiry",
				value: m?.visa_expiry ? formatDate(m.visa_expiry) : null,
			},
			{ label: "Passport", value: m?.passport_number },
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
						<Input
							id="emp-phone"
							type="tel"
							placeholder="+1 555 000 0000"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
						/>
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
						<Label>Visa Status</Label>
						<SelectRoot
							value={visaStatus || undefined}
							onValueChange={setVisaStatus}
						>
							<SelectTrigger>
								<SelectValue placeholder="— Select status —" />
							</SelectTrigger>
							<SelectContent>
								{VISA_STATUS_OPTIONS.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</SelectRoot>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="emp-visa-expiry">Visa Expiry</Label>
						<Input
							id="emp-visa-expiry"
							type="date"
							value={visaExpiry}
							onChange={(e) => setVisaExpiry(e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="emp-passport">Passport Number</Label>
						<Input
							id="emp-passport"
							type="text"
							placeholder="A12345678"
							value={passport}
							onChange={(e) => setPassport(e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="emp-salary">Salary</Label>
						<Input
							id="emp-salary"
							type="number"
							min="0"
							step="0.01"
							placeholder="50000"
							value={salary}
							onChange={(e) => setSalary(e.target.value)}
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

				{/* Leave balances */}
				<div>
					<p className="text-sm font-medium text-ink mb-3">Leave Balances (days)</p>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="emp-sick">Sick</Label>
							<Input
								id="emp-sick"
								type="number"
								min="0"
								placeholder="0"
								value={sickLeave}
								onChange={(e) => setSickLeave(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="emp-vacation">Vacation</Label>
							<Input
								id="emp-vacation"
								type="number"
								min="0"
								placeholder="0"
								value={vacationLeave}
								onChange={(e) => setVacationLeave(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="emp-emergency">Emergency</Label>
							<Input
								id="emp-emergency"
								type="number"
								min="0"
								placeholder="0"
								value={emergencyLeave}
								onChange={(e) => setEmergencyLeave(e.target.value)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="emp-personal">Personal</Label>
							<Input
								id="emp-personal"
								type="number"
								min="0"
								placeholder="0"
								value={personalLeave}
								onChange={(e) => setPersonalLeave(e.target.value)}
							/>
						</div>
					</div>
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
