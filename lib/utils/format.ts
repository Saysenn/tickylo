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
