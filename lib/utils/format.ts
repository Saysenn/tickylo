/**
 * Formats a Date object as a YYYY-MM-DD string using LOCAL date (not UTC).
 * Using toISOString() would return the UTC date which can differ by ±1 day
 * for users in non-UTC timezones.
 */
export function toDateStr(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Returns today's date as a YYYY-MM-DD string.
 */
export function todayDateStr(): string {
	return toDateStr(new Date());
}

/**
 * Returns the date N days ago as a YYYY-MM-DD string.
 */
export function daysAgoDateStr(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return toDateStr(d);
}

/**
 * Returns the first day of the current month as a YYYY-MM-DD string.
 */
export function startOfMonthDateStr(): string {
	const d = new Date();
	return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

/**
 * Returns the first day of last month as a YYYY-MM-DD string.
 */
export function startOfLastMonthDateStr(): string {
	const d = new Date();
	return toDateStr(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

/**
 * Returns the last day of last month as a YYYY-MM-DD string.
 */
export function endOfLastMonthDateStr(): string {
	const d = new Date();
	return toDateStr(new Date(d.getFullYear(), d.getMonth(), 0));
}

/**
 * Returns up to 2 uppercase initials from a name, or the first letter of email as fallback.
 */
export function formatInitials(name: string | null, email: string): string {
	if (name)
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	return email[0].toUpperCase();
}

/**
 * Formats an ISO date string into a human-readable date (e.g. "Feb 20, 2026").
 * Returns "Never" for null/undefined.
 */
export function formatDate(dateStr: string | null | undefined): string {
	if (!dateStr) return "Never";
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Formats an ISO date string into a human-readable time (e.g. "02:30 PM").
 * @param dateStr - The ISO date string to format.
 * @returns The formatted time string.
 */
export function formatTime(dateStr: string): string {
	return new Date(dateStr).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatDateTime(dateStr: string | null | undefined): string {
	if (!dateStr) return "Never";
	const d = new Date(dateStr);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
		+ ", " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Formats milliseconds into a human-readable time string (HH:MM:SS).
 * @param ms - The number of milliseconds to format.
 * @returns The formatted time string.
 */
export function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;

	const hours = h.toString().padStart(2, "0");
	const minutes = m.toString().padStart(2, "0");
	const seconds = s.toString().padStart(2, "0");

	return `${hours}:${minutes}:${seconds}`;
	// return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function msToHours(ms: number) {
	return (ms / 1000 / 60 / 60).toFixed(1);
}

/**
 * Calculates average hours per day worked as a formatted string.
 */
export function avgHours(totalMs: number, daysWorked: number): string {
	if (daysWorked === 0) return "0.0";
	return msToHours(totalMs / daysWorked);
}

/**
 * Formats milliseconds into a compact human-readable duration showing
 * hours, minutes, and seconds accurately (e.g., "3m 23s", "1h 3m 5s").
 * Omits leading zero components (no "0h"), always shows at least seconds.
 */
export function formatDurationMs(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	if (h > 0) return `${h}h ${m}m ${s}s`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

/**
 * Formats a YYYY-MM-DD date string into a short day label (e.g., "Mon, Feb 20").
 * Appends T00:00:00 to force local timezone parsing.
 */
export function formatDayLabel(dateStr: string): string {
	const d = new Date(dateStr + "T00:00:00");
	return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Formats the exact duration between two ISO datetime strings (e.g., "3m 23s", "1h 2m 5s").
 * No rounding — delegates to formatDurationMs.
 */
export function formatDurationBetween(start: string, end: string): string {
	const ms = new Date(end).getTime() - new Date(start).getTime();
	return formatDurationMs(ms);
}

/**
 * Converts an ISO datetime string to a "YYYY-MM-DD" value suitable for
 * <input type="date">. Returns "" for null/undefined.
 */
export function toDateInput(iso: string | null | undefined): string {
	if (!iso) return "";
	return iso.slice(0, 10);
}

/**
 * Converts an ISO datetime string to a "YYYY-MM-DDTHH:MM" value suitable for
 * <input type="datetime-local">. Uses LOCAL time so the browser shows the right value.
 * Returns "" for null/undefined.
 */
export function toDatetimeInput(iso: string | null | undefined): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Formats a due-date ISO string. Shows time only when the stored value has a
 * non-zero UTC time (i.e. was set via datetime-local, not a legacy date-only field).
 */
export function formatDueDate(dateStr: string | null | undefined): string {
	if (!dateStr) return "Never";
	const d = new Date(dateStr);
	const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0;
	if (hasTime) {
		return d.toLocaleDateString("en-US", {
			month: "short", day: "numeric", year: "numeric",
			hour: "2-digit", minute: "2-digit",
		});
	}
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Converts a nullable number to its string representation for number inputs.
 * Returns "" for null/undefined so the input renders as empty.
 */
export function toIntInput(v: number | null | undefined): string {
	return v != null ? String(v) : "";
}

/**
 * Returns a human-readable relative time string (e.g. "2m ago", "3h ago", "yesterday").
 */
export function formatRelativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return "yesterday";
	if (days < 7) return `${days}d ago`;
	return formatDate(iso);
}

// ── Timezones ─────────────────────────────────────────────────────────────────

export const TIMEZONES: { value: string; label: string }[] = [
	{ value: "UTC",                 label: "(UTC+0) UTC" },
	// Asia Pacific
	{ value: "Asia/Manila",         label: "(UTC+8) Manila" },
	{ value: "Asia/Singapore",      label: "(UTC+8) Singapore" },
	{ value: "Asia/Kuala_Lumpur",   label: "(UTC+8) Kuala Lumpur" },
	{ value: "Asia/Hong_Kong",      label: "(UTC+8) Hong Kong" },
	{ value: "Asia/Shanghai",       label: "(UTC+8) Beijing / Shanghai" },
	{ value: "Asia/Taipei",         label: "(UTC+8) Taipei" },
	{ value: "Asia/Tokyo",          label: "(UTC+9) Tokyo" },
	{ value: "Asia/Seoul",          label: "(UTC+9) Seoul" },
	{ value: "Asia/Bangkok",        label: "(UTC+7) Bangkok" },
	{ value: "Asia/Ho_Chi_Minh",    label: "(UTC+7) Ho Chi Minh City" },
	{ value: "Asia/Jakarta",        label: "(UTC+7) Jakarta" },
	{ value: "Asia/Kolkata",        label: "(UTC+5:30) Mumbai / New Delhi" },
	{ value: "Asia/Dhaka",          label: "(UTC+6) Dhaka" },
	{ value: "Asia/Colombo",        label: "(UTC+5:30) Colombo" },
	{ value: "Asia/Kathmandu",      label: "(UTC+5:45) Kathmandu" },
	{ value: "Asia/Karachi",        label: "(UTC+5) Karachi" },
	{ value: "Asia/Almaty",         label: "(UTC+6) Almaty" },
	// Middle East
	{ value: "Asia/Dubai",          label: "(UTC+4) Dubai" },
	{ value: "Asia/Riyadh",         label: "(UTC+3) Riyadh" },
	{ value: "Asia/Kuwait",         label: "(UTC+3) Kuwait City" },
	{ value: "Asia/Beirut",         label: "(UTC+2) Beirut" },
	{ value: "Asia/Jerusalem",      label: "(UTC+2) Jerusalem" },
	// Africa
	{ value: "Africa/Cairo",        label: "(UTC+2) Cairo" },
	{ value: "Africa/Nairobi",      label: "(UTC+3) Nairobi" },
	{ value: "Africa/Lagos",        label: "(UTC+1) Lagos" },
	{ value: "Africa/Johannesburg", label: "(UTC+2) Johannesburg" },
	// Europe
	{ value: "Europe/London",       label: "(UTC+0) London" },
	{ value: "Europe/Paris",        label: "(UTC+1) Paris" },
	{ value: "Europe/Berlin",       label: "(UTC+1) Berlin" },
	{ value: "Europe/Madrid",       label: "(UTC+1) Madrid" },
	{ value: "Europe/Rome",         label: "(UTC+1) Rome" },
	{ value: "Europe/Amsterdam",    label: "(UTC+1) Amsterdam" },
	{ value: "Europe/Moscow",       label: "(UTC+3) Moscow" },
	{ value: "Europe/Istanbul",     label: "(UTC+3) Istanbul" },
	// Americas
	{ value: "America/New_York",    label: "(UTC-5) New York" },
	{ value: "America/Chicago",     label: "(UTC-6) Chicago" },
	{ value: "America/Denver",      label: "(UTC-7) Denver" },
	{ value: "America/Los_Angeles", label: "(UTC-8) Los Angeles" },
	{ value: "America/Toronto",     label: "(UTC-5) Toronto" },
	{ value: "America/Vancouver",   label: "(UTC-8) Vancouver" },
	{ value: "America/Sao_Paulo",   label: "(UTC-3) São Paulo" },
	{ value: "America/Mexico_City", label: "(UTC-6) Mexico City" },
	{ value: "America/Bogota",      label: "(UTC-5) Bogotá" },
	{ value: "America/Lima",        label: "(UTC-5) Lima" },
	// Pacific & Oceania
	{ value: "Australia/Sydney",    label: "(UTC+11) Sydney" },
	{ value: "Australia/Melbourne", label: "(UTC+11) Melbourne" },
	{ value: "Australia/Perth",     label: "(UTC+8) Perth" },
	{ value: "Pacific/Auckland",    label: "(UTC+13) Auckland" },
	{ value: "Pacific/Honolulu",    label: "(UTC-10) Honolulu" },
];
