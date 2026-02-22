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
