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
import {
	SelectRoot,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { formatDate, toDateInput } from "@/lib/utils/format";

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
	{ code: "+971", flag: "🇦🇪", name: "AE" },
	{ code: "+966", flag: "🇸🇦", name: "SA" },
	{ code: "+49", flag: "🇩🇪", name: "DE" },
	{ code: "+33", flag: "🇫🇷", name: "FR" },
	{ code: "+39", flag: "🇮🇹", name: "IT" },
	{ code: "+34", flag: "🇪🇸", name: "ES" },
	{ code: "+31", flag: "🇳🇱", name: "NL" },
	{ code: "+1-CA", flag: "🇨🇦", name: "CA" },
];

function parsePhone(raw: string): { dialCode: string; local: string } {
	for (const c of COUNTRY_CODES) {
		const code = c.code.replace("-CA", "");
		if (raw.startsWith(code)) return { dialCode: c.code, local: raw.slice(code.length).trim() };
	}
	return { dialCode: "+63", local: raw };
}

export function ProfileMetaSection() {
	const queryClient = useQueryClient();

	const { data: meta, isLoading } = useQuery<UserMeta | null>({
		queryKey: ["user-meta"],
		queryFn: () => APIService.users.getMeta(),
	});

	const [dialCode, setDialCode] = useState("+63");
	const [localPhone, setLocalPhone] = useState("");
	const [dob, setDob] = useState("");
	const [address, setAddress] = useState("");

	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	useEffect(() => {
		if (meta) {
			const parsed = parsePhone(meta.phone ?? "");
			setDialCode(parsed.dialCode);
			setLocalPhone(parsed.local);
			setDob(toDateInput(meta.dob));
			setAddress(meta.address ?? "");
		}
	}, [meta]);

	const fullPhone = localPhone ? `${dialCode.replace("-CA", "")}${localPhone}` : undefined;

	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			APIService.users.updateMeta({
				phone: fullPhone,
				dob: dob || undefined,
				address: address || undefined,
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
					<div className="w-8 h-8 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
						<ClipboardList className="w-3.5 h-3.5 text-ink-2" />
					</div>
					<div>
						<CardTitle className="text-sm">Personal Information</CardTitle>
						<CardDescription className="text-xs">
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
