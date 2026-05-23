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
		description: "Corporate / legal. Numbered items, formal column headers, navy palette.",
		buildXlsx:   buildClassicXlsx,
	},
	{
		id:          "modern-xlsx",
		name:        "Modern",
		format:      "xlsx",
		description: "Creative agency. Bold org name, no borders on rows, editorial column names.",
		buildXlsx:   buildModernXlsx,
	},
	{
		id:          "minimal-xlsx",
		name:        "Minimal",
		format:      "xlsx",
		description: "Freelancer. Looks like a typed letter. Lowercase headers, no fill, sparse.",
		buildXlsx:   buildMinimalXlsx,
	},
	{
		id:          "classic-pdf",
		name:        "Classic",
		format:      "pdf",
		description: "Corporate / legal. Numbered line items with dotted leaders. Letterhead style.",
		buildPdf:    buildClassicPdf,
	},
	{
		id:          "modern-pdf",
		name:        "Modern",
		format:      "pdf",
		description: "Creative agency. Each item is a block — title prominent, metadata below.",
		buildPdf:    buildModernPdf,
	},
	{
		id:          "minimal-pdf",
		name:        "Minimal",
		format:      "pdf",
		description: "Freelancer. Plain text, dotted leaders, single rule. Looks hand-typed.",
		buildPdf:    buildMinimalPdf,
	},
];

export function getTemplate(id: string): TemplateDefinition | undefined {
	return TEMPLATES.find((t) => t.id === id);
}
