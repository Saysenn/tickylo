import type { TemplateDefinition } from "./types";
import { buildClassicXlsx } from "./xlsx/classic";
import { buildModernXlsx }  from "./xlsx/modern";
import { buildMinimalXlsx } from "./xlsx/minimal";
import { buildClassicPdf }  from "./pdf/classic";
import { buildModernPdf }   from "./pdf/modern";
import { buildMinimalPdf }  from "./pdf/minimal";

export { DEFAULT_CONFIG } from "./types";
export type { InvoiceConfig, InvoiceData, TemplateDefinition } from "./types";

export const TEMPLATES: TemplateDefinition[] = [
	{
		id:          "classic-xlsx",
		name:        "Classic",
		format:      "xlsx",
		description: "Standard bordered table with org header. Safe and universally readable.",
		buildXlsx:   buildClassicXlsx,
	},
	{
		id:          "modern-xlsx",
		name:        "Modern",
		format:      "xlsx",
		description: "Full-width colored header band, alternating shaded rows, accent totals.",
		buildXlsx:   buildModernXlsx,
	},
	{
		id:          "minimal-xlsx",
		name:        "Minimal",
		format:      "xlsx",
		description: "Borderless design with bottom-line separators. Clean agency style.",
		buildXlsx:   buildMinimalXlsx,
	},
	{
		id:          "classic-pdf",
		name:        "Classic",
		format:      "pdf",
		description: "Logo top-left, BILL TO block, bordered table with footer.",
		buildPdf:    buildClassicPdf,
	},
	{
		id:          "modern-pdf",
		name:        "Modern",
		format:      "pdf",
		description: "Full-width branded banner, two-column info block, clean table.",
		buildPdf:    buildModernPdf,
	},
	{
		id:          "minimal-pdf",
		name:        "Minimal",
		format:      "pdf",
		description: "Small logo, borderless table, accent rule above total, subtle footer.",
		buildPdf:    buildMinimalPdf,
	},
];

export function getTemplate(id: string): TemplateDefinition | undefined {
	return TEMPLATES.find((t) => t.id === id);
}
