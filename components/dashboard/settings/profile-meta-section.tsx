"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Building2 } from "lucide-react";
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
import { Combobox } from "@/components/ui/combobox";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, toDateInput } from "@/lib/utils/format";

interface UserMeta {
	id?: string;
	user_id?: string;
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
	bio: string | null;
	skills: string | null;
	notes: string | null;
	department: { id: string; name: string } | null;
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
	const [passportNumber, setPassportNumber] = useState("");
	const [visaStatus, setVisaStatus] = useState("");
	const [visaExpiry, setVisaExpiry] = useState("");
	const [bio, setBio] = useState("");
	const [skills, setSkills] = useState("");
	const [notes, setNotes] = useState("");

	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const [isDownloading, setIsDownloading] = useState(false);
	const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
	const [isDeletionDialogOpen, setIsDeletionDialogOpen] = useState(false);
	const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
	const [deletionMsg, setDeletionMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

	async function handleDownload() {
		setIsDownloading(true);
		setDownloadMsg(null);
		try {
			const response = await APIService.users.export();
			const blob = new Blob([response.data], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "my-data.json";
			a.click();
			URL.revokeObjectURL(url);
			setDownloadMsg("Download started.");
		} catch {
			setDownloadMsg("Failed to download. Please try again.");
		} finally {
			setIsDownloading(false);
			setTimeout(() => setDownloadMsg(null), 4000);
		}
	}

	async function handleRequestDeletion() {
		setIsRequestingDeletion(true);
		setDeletionMsg(null);
		try {
			await APIService.users.requestDeletion();
			setIsDeletionDialogOpen(false);
			setDeletionMsg({ text: "Account deletion scheduled. You have 30 days to cancel.", type: "success" });
		} catch {
			setDeletionMsg({ text: "Failed to request deletion. A request may already be pending.", type: "error" });
		} finally {
			setIsRequestingDeletion(false);
			setTimeout(() => setDeletionMsg(null), 6000);
		}
	}

	useEffect(() => {
		if (meta) {
			const parsed = parsePhone(meta.phone ?? "");
			setDialCode(parsed.dialCode);
			setLocalPhone(parsed.local);
			setDob(toDateInput(meta.dob));
			setAddress(meta.address ?? "");
			setPassportNumber(meta.passport_number ?? "");
			setVisaStatus(meta.visa_status ?? "");
			setVisaExpiry(toDateInput(meta.visa_expiry));
			setBio(meta.bio ?? "");
			setSkills(meta.skills ?? "");
			setNotes(meta.notes ?? "");
		}
	}, [meta]);

	const fullPhone = localPhone ? `${dialCode.replace("-CA", "")}${localPhone}` : undefined;

	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			APIService.users.updateMeta({
				phone: fullPhone,
				dob: dob || undefined,
				address: address || undefined,
				passport_number: passportNumber || undefined,
				visa_status: visaStatus || undefined,
				visa_expiry: visaExpiry || undefined,
				bio: bio || null,
				skills: skills || null,
				notes: notes || null,
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
			meta.personal_leave != null ||
			meta.department != null);

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
								{/* Phone with country code */}
								<div className="space-y-1.5">
									<Label htmlFor="meta-phone">Phone</Label>
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
											id="meta-phone"
											type="tel"
											placeholder={PHONE_PLACEHOLDER[dialCode] ?? "Phone number"}
											value={localPhone}
											onChange={(e) => setLocalPhone(e.target.value)}
											className="h-9 text-sm"
										/>
									</div>
								</div>

								{/* Date of birth */}
								<div className="space-y-1.5">
									<Label htmlFor="meta-dob">Date of Birth</Label>
									<Input
										id="meta-dob"
										type="date"
										value={dob}
										onChange={(e) => setDob(e.target.value)}
										className="h-9 text-sm"
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

							{/* Travel & Documents */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<Label htmlFor="meta-passport">Passport Number</Label>
									<Input
										id="meta-passport"
										type="text"
										placeholder="A12345678"
										value={passportNumber}
										onChange={(e) => setPassportNumber(e.target.value)}
										className="h-9 text-sm"
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="meta-visa-status">Visa Status</Label>
									<Input
										id="meta-visa-status"
										type="text"
										placeholder="e.g. Work Permit, PR, Citizen"
										value={visaStatus}
										onChange={(e) => setVisaStatus(e.target.value)}
										className="h-9 text-sm"
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="meta-visa-expiry">Visa Expiry</Label>
								<Input
									id="meta-visa-expiry"
									type="date"
									value={visaExpiry}
									onChange={(e) => setVisaExpiry(e.target.value)}
									className="h-9 text-sm w-full sm:w-1/2"
								/>
							</div>

							{/* Bio */}
							<div className="space-y-1.5">
								<Label htmlFor="meta-bio">Bio</Label>
								<textarea
									id="meta-bio"
									rows={3}
									placeholder="A short description about yourself…"
									value={bio}
									onChange={(e) => setBio(e.target.value)}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
								/>
							</div>

							{/* Skills */}
							<div className="space-y-1.5">
								<Label htmlFor="meta-skills">Skills</Label>
								<textarea
									id="meta-skills"
									rows={3}
									placeholder="e.g. TypeScript, React, Node.js (one per line or comma-separated)"
									value={skills}
									onChange={(e) => setSkills(e.target.value)}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
								/>
							</div>

							{/* Notes */}
							<div className="space-y-1.5">
								<Label htmlFor="meta-notes">Notes</Label>
								<textarea
									id="meta-notes"
									rows={3}
									placeholder="Any additional notes…"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
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
										{meta?.department != null && (
											<div>
												<p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
													Department
												</p>
												<div className="flex items-center gap-1.5">
													<Building2 className="w-3.5 h-3.5 text-ink-3" />
													<p className="font-medium text-ink">{meta.department.name}</p>
												</div>
											</div>
										)}

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

						{/* ── Data & Privacy ── */}
						<Separator />
						<div className="space-y-3">
							<div>
								<p className="text-sm font-medium text-ink">Data &amp; Privacy</p>
								<p className="text-xs text-ink-3 mt-0.5">
									Download a copy of your data or request account deletion.
								</p>
							</div>

							<div className="flex flex-wrap items-center gap-3">
								<Button
									variant="outline"
									size="sm"
									onClick={handleDownload}
									disabled={isDownloading}
								>
									{isDownloading ? (
										<>
											<div className="w-3.5 h-3.5 border-2 border-ink-3/40 border-t-ink-3 rounded-full animate-spin mr-2" />
											Downloading…
										</>
									) : (
										"Download my data"
									)}
								</Button>

								<Button
									variant="destructive"
									size="sm"
									onClick={() => setIsDeletionDialogOpen(true)}
								>
									Request account deletion
								</Button>

								{downloadMsg && (
									<p className="text-sm text-ink-3">{downloadMsg}</p>
								)}
							</div>

							{deletionMsg && (
								<p className={`text-sm ${deletionMsg.type === "success" ? "text-green-600" : "text-destructive"}`}>
									{deletionMsg.text}
								</p>
							)}
						</div>

						<DialogRoot open={isDeletionDialogOpen} onOpenChange={setIsDeletionDialogOpen}>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Request Account Deletion</DialogTitle>
								</DialogHeader>
								<div className="space-y-4 pt-1">
									<p className="text-sm text-ink-3">
										Your account will be scheduled for permanent deletion in{" "}
										<span className="font-medium text-ink">30 days</span>. During this
										period you can cancel the request from this settings page. After
										30 days all your data will be irreversibly removed.
									</p>
									<div className="flex justify-end gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setIsDeletionDialogOpen(false)}
											disabled={isRequestingDeletion}
										>
											Cancel
										</Button>
										<Button
											variant="destructive"
											size="sm"
											onClick={handleRequestDeletion}
											disabled={isRequestingDeletion}
										>
											{isRequestingDeletion ? (
												<>
													<div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
													Requesting…
												</>
											) : (
												"Confirm deletion request"
											)}
										</Button>
									</div>
								</div>
							</DialogContent>
						</DialogRoot>
					</>
				)}
			</CardContent>
		</Card>
	);
}
