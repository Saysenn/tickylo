/**
 * Returns up to 2 uppercase initials from a name, or the first letter of email as fallback.
 */
export function getInitials(name: string | null, email: string): string {
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
