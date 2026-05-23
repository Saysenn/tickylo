// Registers pre-loaded font data (base64 TTF) with a jsPDF document.
// Font data must be loaded by the caller (e.g. the API route using fs.readFileSync).
// This module has NO Node.js dependencies and is safe to import on the client.

export function registerFont(
	doc: { addFileToVFS: (n: string, b: string) => void; addFont: (n: string, id: string, style: string) => void },
	fontId: string,
	base64: string,
	style: "normal" | "bold" = "normal",
): void {
	doc.addFileToVFS(`${fontId}.ttf`, base64);
	doc.addFont(`${fontId}.ttf`, fontId, style);
}

// Registers all fonts from InvoiceConfig.fonts into the jsPDF document.
export function registerConfigFonts(
	doc: { addFileToVFS: (n: string, b: string) => void; addFont: (n: string, id: string, style: string) => void },
	fonts: Record<string, string> = {},
): void {
	for (const [fontId, base64] of Object.entries(fonts)) {
		registerFont(doc, fontId, base64);
	}
}
