"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import APIService from "@/lib/infra/api";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface UserMeta {
	id: string;
	user_id: string;
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

// Convert ISO datetime string → "YYYY-MM-DD" for <input type="date">
function toDateInput(iso: string | null | undefined): string {
	if (!iso) return "";
	return iso.slice(0, 10);
}

const VISA_STATUS_OPTIONS = [
	{ value: "", label: "— Select status —" },
	{ value: "valid", label: "Valid" },
	{ value: "expired", label: "Expired" },
	{ value: "pending", label: "Pending" },
	{ value: "not_applicable", label: "Not applicable" },
];

export function ProfileMetaSection() {
	const queryClient = useQueryClient();

	const { data: meta, isLoading } = useQuery<UserMeta | null>({
		queryKey: ["user-meta"],
		queryFn: () => APIService.users.getMeta(),
	});

	const [phone, setPhone] = useState("");
	const [dob, setDob] = useState("");
	const [address, setAddress] = useState("");
	const [passportNumber, setPassportNumber] = useState("");
	const [visaStatus, setVisaStatus] = useState("");
	const [visaExpiry, setVisaExpiry] = useState("");

	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// Pre-fill form when meta loads
	useEffect(() => {
		if (meta) {
			setPhone(meta.phone ?? "");
			setDob(toDateInput(meta.dob));
			setAddress(meta.address ?? "");
			setPassportNumber(meta.passport_number ?? "");
			setVisaStatus(meta.visa_status ?? "");
			setVisaExpiry(toDateInput(meta.visa_expiry));
		}
	}, [meta]);

	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			APIService.users.updateMeta({
				phone: phone || undefined,
				dob: dob || undefined,
				address: address || undefined,
				passport_number: passportNumber || undefined,
				visa_status: visaStatus || undefined,
				visa_expiry: visaExpiry || undefined,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user-meta"] });
			setSuccessMsg("Changes saved.");
			setErrorMsg(null);
			setTimeout(() => setSuccessMsg(null), 3000);
		},
		onError: () => {
			setErrorMsg("Failed to save. Please try again.");
			setSuccessMsg(null);
		},
	});

	// Determine if read-only admin section has anything to show
	const hasAdminFields =
		meta != null &&
		(meta.salary != null ||
			meta.date_joined != null ||
			meta.sick_leave != null ||
			meta.vacation_leave != null ||
			meta.emergency_leave != null ||
			meta.personal_leave != null);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-xl bg-mint/15 flex items-center justify-center shrink-0">
						<ClipboardList className="w-4 h-4 text-ink-2" />
					</div>
					<div>
						<CardTitle className="text-base">Personal Information</CardTitle>
						<CardDescription>
							Keep your contact and travel details up to date.
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-6">
				{isLoading ? (
					<div className="flex items-center justify-center py-10">
						<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
					</div>
				) : (
					<>
						{/* ── Editable fields ── */}
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{/* Phone */}
								<div className="space-y-1.5">
									<Label htmlFor="meta-phone">Phone</Label>
									<Input
										id="meta-phone"
										type="tel"
										placeholder="+1 555 000 0000"
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
									/>
								</div>

								{/* Date of birth */}
								<div className="space-y-1.5">
									<Label htmlFor="meta-dob">Date of Birth</Label>
									<Input
										id="meta-dob"
										type="date"
										value={dob}
										onChange={(e) => setDob(e.target.value)}
									/>
								</div>

								{/* Visa Status */}
								<div className="space-y-1.5">
									<Label htmlFor="meta-visa-status">Visa Status</Label>
									<select
										id="meta-visa-status"
										value={visaStatus}
										onChange={(e) => setVisaStatus(e.target.value)}
										className={cn(
											"border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]",
											"focus-visible:border-ring/50 focus-visible:ring-ring/25 focus-visible:ring-1",
										)}
									>
										{VISA_STATUS_OPTIONS.map((o) => (
											<option key={o.value} value={o.value}>
												{o.label}
											</option>
										))}
									</select>
								</div>

								{/* Visa Expiry */}
								<div className="space-y-1.5">
									<Label htmlFor="meta-visa-expiry">Visa Expiry</Label>
									<Input
										id="meta-visa-expiry"
										type="date"
										value={visaExpiry}
										onChange={(e) => setVisaExpiry(e.target.value)}
									/>
								</div>

								{/* Passport number */}
								<div className="space-y-1.5">
									<Label htmlFor="meta-passport">Passport Number</Label>
									<Input
										id="meta-passport"
										type="text"
										placeholder="A12345678"
										value={passportNumber}
										onChange={(e) => setPassportNumber(e.target.value)}
									/>
								</div>
							</div>

							{/* Address — full width */}
							<div className="space-y-1.5">
								<Label htmlFor="meta-address">Address</Label>
								<Input
									id="meta-address"
									type="text"
									placeholder="123 Main St, City, Country"
									value={address}
									onChange={(e) => setAddress(e.target.value)}
								/>
							</div>

							{/* Save row */}
							<div className="flex items-center gap-3 pt-1">
								<Button
									size="sm"
									onClick={() => mutate()}
									disabled={isPending}
								>
									{isPending ? (
										<>
											<div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
											Saving…
										</>
									) : (
										"Save Changes"
									)}
								</Button>

								{successMsg && (
									<p className="text-sm text-green-600">{successMsg}</p>
								)}
								{errorMsg && (
									<p className="text-sm text-destructive">{errorMsg}</p>
								)}
							</div>
						</div>

						{/* ── Read-only admin-managed fields ── */}
						{hasAdminFields && (
							<>
								<Separator />
								<div className="space-y-3">
									<div>
										<p className="text-sm font-medium text-ink">
											Account Details
										</p>
										<p className="text-xs text-ink-3 mt-0.5">
											Managed by your administrator.
										</p>
									</div>

									<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
										{meta?.salary != null && (
											<div>
												<p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
													Salary
												</p>
												<p className="font-medium text-ink">
													${meta.salary.toLocaleString()}
												</p>
											</div>
										)}

										{meta?.date_joined != null && (
											<div>
												<p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
													Date Joined
												</p>
												<p className="font-medium text-ink">
													{formatDate(meta.date_joined)}
												</p>
											</div>
										)}

										{meta?.sick_leave != null && (
											<div>
												<p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
													Sick Leave
												</p>
												<p className="font-medium text-ink">
													{meta.sick_leave} days
												</p>
											</div>
										)}

										{meta?.vacation_leave != null && (
											<div>
												<p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
													Vacation Leave
												</p>
												<p className="font-medium text-ink">
													{meta.vacation_leave} days
												</p>
											</div>
										)}

										{meta?.emergency_leave != null && (
											<div>
												<p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
													Emergency Leave
												</p>
												<p className="font-medium text-ink">
													{meta.emergency_leave} days
												</p>
											</div>
										)}

										{meta?.personal_leave != null && (
											<div>
												<p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
													Personal Leave
												</p>
												<p className="font-medium text-ink">
													{meta.personal_leave} days
												</p>
											</div>
										)}
									</div>
								</div>
							</>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
