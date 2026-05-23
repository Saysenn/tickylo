import type ExcelJS from "exceljs";

// ── Config ────────────────────────────────────────────────────────────────────

export interface InvoiceConfig {
	primaryColor: string;   // 6-char hex, no #, e.g. "1A1A2E"
	accentColor: string;    // 6-char hex, no #
	fontFamily: "helvetica" | "times" | "courier";
	footerNote: string;
	showHours: boolean;
	showRate: boolean;
	showDiscount: boolean;
	[key: string]: unknown;
}

export const DEFAULT_CONFIG: InvoiceConfig = {
	primaryColor: "1A1A2E",
	accentColor:  "16213E",
	fontFamily:   "helvetica",
	footerNote:   "Thank you for your business.",
	showHours:    true,
	showRate:     true,
	showDiscount: true,
};

// ── Invoice data passed to templates ─────────────────────────────────────────

export interface InvoiceLineItem {
	ticket_id:        string;
	title:            string;
	employee:         string;
	completed_at:     string;
	rate_type:        string;
	billable_hours:   number;
	rate:             number;
	currency:         string;
	subtotal:         number;
	discount_percent: number;
	discount_amount:  number;
	net_total:        number;
	client_id:        string | null;
	client_name:      string;
	client_email:     string | null;
	billing_cycle:    string;
	payment_terms:    string;
}

export interface InvoiceData {
	type:          "client" | "tally";
	lineItems:     InvoiceLineItem[];
	invoiceNumber: string;
	issueDate:     string;
	orgName:       string;
	orgLogoUrl?:   string;
	dateFrom:      string;
	dateTo:        string;
}

// ── Template definition ───────────────────────────────────────────────────────

export interface TemplateDefinition {
	id:          string;
	name:        string;
	format:      "xlsx" | "pdf";
	description: string;
	buildXlsx?: (wb: ExcelJS.Workbook, data: InvoiceData, config: InvoiceConfig) => Promise<void>;
	buildPdf?:  (data: InvoiceData, config: InvoiceConfig) => Promise<ArrayBuffer>;
}
