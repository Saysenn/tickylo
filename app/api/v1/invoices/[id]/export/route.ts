import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";
import ExcelJS from "exceljs";
import { TEMPLATES, DEFAULT_CONFIG, getTemplate } from "@/lib/invoice-templates";
import type { InvoiceConfig, InvoiceData } from "@/lib/invoice-templates";

function loadFonts(): Record<string, string> {
	const fonts: Record<string, string> = {};
	const load = (file: string, id: string) => {
		try { fonts[id] = readFileSync(join(process.cwd(), "public", file)).toString("base64"); } catch {}
	};
	load("Bootshaus-Regular.ttf", "Bootshaus");
	load("Roboto-VariableFont_wdth,wght.ttf", "Roboto");
	return fonts;
}

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "reports");
		if (gate) return gate;

		const { id } = await params;
		const invoice = await prisma.invoice.findUnique({
			where: { id },
			include: { client: { select: { name: true } } },
		});
		if (!invoice || invoice.org_id !== orgId) return errorResponse("Invoice not found", 404);

		const orgFull = await prisma.organization.findUnique({
			where: { id: orgId },
			select: { slug: true, name: true, invoice_config: true, logo_url: true },
		});

		const template = getTemplate(invoice.template_id) ?? TEMPLATES[0];
		const rawConfig = (orgFull?.invoice_config ?? {}) as Partial<InvoiceConfig>;
		const config: InvoiceConfig = { ...DEFAULT_CONFIG, ...rawConfig, fonts: loadFonts() };

		const whereClause: any = {
			org_id: orgId,
			status: "completed",
			completed_at: { gte: invoice.date_from, lte: invoice.date_to },
			client_id: invoice.type === "client" ? invoice.client_id : { not: null },
		};

		const tickets = await prisma.ticket.findMany({
			where: whereClause,
			include: {
				assignee:    { select: { name: true, email: true } },
				client:      { select: { id: true, name: true, email: true, rate_type: true, hourly_rate: true, discount_percent: true, currency: true, billing_cycle: true, payment_terms: true, deleted_at: true } },
				timeEntries: { select: { start_time: true, end_time: true } },
			},
			orderBy: [{ client_id: "asc" }, { completed_at: "asc" }],
		});

		const billableTickets = tickets.filter((t) => t.client?.rate_type !== "none");

		const lineItems = billableTickets.map((ticket) => {
			const totalMs = ticket.timeEntries.reduce((sum, te) => {
				if (!te.end_time) return sum;
				return sum + (te.end_time.getTime() - te.start_time.getTime());
			}, 0);
			const billableHours  = Math.round((ticket.billable_hours != null ? ticket.billable_hours : totalMs / 3600000) * 100) / 100;
			const rateType       = ticket.client?.rate_type ?? "hourly";
			const rate           = ticket.client?.hourly_rate ?? 0;
			const subtotal       = Math.round((rateType === "fixed" ? rate : billableHours * rate) * 100) / 100;
			const discountPct    = ticket.client?.discount_percent ?? 0;
			const discountAmt    = Math.round(subtotal * discountPct / 100 * 100) / 100;
			const netTotal       = Math.round((subtotal - discountAmt) * 100) / 100;
			const cur            = ticket.client?.currency ?? "USD";
			const deactivated    = !!ticket.client?.deleted_at;
			const clientName     = deactivated
				? `${ticket.client?.name ?? ticket.client_name ?? "No Client"} [Deactivated]`
				: ticket.client?.name ?? ticket.client_name ?? "No Client";

			return {
				ticket_id: ticket.id, title: ticket.title,
				employee: ticket.assignee?.name ?? ticket.assignee?.email ?? "Unassigned",
				completed_at: ticket.completed_at ? ticket.completed_at.toISOString().split("T")[0] : "",
				rate_type: rateType, billable_hours: billableHours, rate, currency: cur,
				subtotal, discount_percent: discountPct, discount_amount: discountAmt, net_total: netTotal,
				client_id: ticket.client?.id ?? null, client_name: clientName,
				client_email: ticket.client?.email ?? ticket.client_email ?? null,
				billing_cycle: ticket.client?.billing_cycle ?? "per_ticket",
				payment_terms: ticket.client?.payment_terms ?? "net_30",
			};
		});

		const dateFrom = invoice.date_from.toISOString().split("T")[0];
		const dateTo   = invoice.date_to.toISOString().split("T")[0];

		const invoiceData: InvoiceData = {
			type:        invoice.type as "client" | "tally",
			lineItems,
			invoiceNumber: invoice.invoice_number,
			issueDate:     invoice.generated_at.toISOString().split("T")[0],
			orgName:       orgFull?.name ?? "Organization",
			orgLogoUrl:    orgFull?.logo_url ?? undefined,
			dateFrom,
			dateTo,
		};

		if (template.format === "pdf" && template.buildPdf) {
			const pdfBuffer = await template.buildPdf(invoiceData, config);
			return new Response(pdfBuffer, {
				headers: {
					"Content-Type": "application/pdf",
					"Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
				},
			});
		}

		const wb = new ExcelJS.Workbook();
		wb.creator  = orgFull?.name ?? "Tickworks";
		wb.created  = invoice.generated_at;
		wb.modified = new Date();

		const xlsxTemplate = template.buildXlsx ? template : TEMPLATES.find((t) => t.format === "xlsx")!;
		await xlsxTemplate.buildXlsx!(wb, invoiceData, config);

		const buffer = await wb.xlsx.writeBuffer();
		return new Response(buffer, {
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": `attachment; filename="${invoice.invoice_number}.xlsx"`,
			},
		});
	} catch (err) {
		console.error("[GET /api/v1/invoices/[id]/export]", err);
		return errorResponse("Internal server error", 500);
	}
}
