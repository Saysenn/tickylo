import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";
import ExcelJS from "exceljs";
import { TEMPLATES, DEFAULT_CONFIG, getTemplate } from "@/lib/invoice-templates";
import type { InvoiceConfig, InvoiceData } from "@/lib/invoice-templates";

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "reports");
		if (gate) return gate;

		const body = await request.json();
		const { type, client_id, date_from, date_to, tz_offset = 0, org_name, template_id } = body;

		if (!type || !date_from || !date_to)
			return errorResponse("Missing required params: type, date_from, date_to", 400);
		if (type === "client" && !client_id)
			return errorResponse("client_id is required when type=client", 400);

		// Resolve template and config
		const orgFull = await prisma.organization.findUnique({
			where: { id: orgId },
			select: { slug: true, invoice_template: true, invoice_config: true, logo_url: true },
		});

		const resolvedTemplateId = template_id ?? orgFull?.invoice_template ?? "classic-xlsx";
		const template = getTemplate(resolvedTemplateId) ?? TEMPLATES[0];
		const rawConfig = (orgFull?.invoice_config ?? {}) as Partial<InvoiceConfig>;
		const config: InvoiceConfig = { ...DEFAULT_CONFIG, ...rawConfig };

		// Date range
		const fromDate = new Date(`${date_from}T00:00:00.000Z`);
		fromDate.setMinutes(fromDate.getMinutes() - tz_offset);
		const toDate = new Date(`${date_to}T23:59:59.999Z`);
		toDate.setMinutes(toDate.getMinutes() - tz_offset);

		const whereClause: any = {
			org_id: orgId,
			status: "completed",
			completed_at: { gte: fromDate, lte: toDate },
			client_id: type === "client" ? client_id : { not: null },
		};

		const tickets = await prisma.ticket.findMany({
			where: whereClause,
			include: {
				assignee: { select: { name: true, email: true } },
				client: {
					select: {
						id: true, name: true, email: true,
						rate_type: true, hourly_rate: true,
						discount_percent: true, currency: true,
						billing_cycle: true, payment_terms: true,
						deleted_at: true,
					},
				},
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
			const billableHours = Math.round(
				(ticket.billable_hours != null ? ticket.billable_hours : totalMs / 3600000) * 100
			) / 100;
			const rateType    = ticket.client?.rate_type ?? "hourly";
			const rate        = ticket.client?.hourly_rate ?? 0;
			const subtotal    = Math.round((rateType === "fixed" ? rate : billableHours * rate) * 100) / 100;
			const discountPct = ticket.client?.discount_percent ?? 0;
			const discountAmt = Math.round(subtotal * discountPct / 100 * 100) / 100;
			const netTotal    = Math.round((subtotal - discountAmt) * 100) / 100;
			const cur         = ticket.client?.currency ?? "USD";
			const deactivated = !!ticket.client?.deleted_at;
			const clientName  = deactivated
				? `${ticket.client?.name ?? ticket.client_name ?? "No Client"} [Deactivated]`
				: ticket.client?.name ?? ticket.client_name ?? "No Client";

			return {
				ticket_id:        ticket.id,
				title:            ticket.title,
				employee:         ticket.assignee?.name ?? ticket.assignee?.email ?? "Unassigned",
				completed_at:     ticket.completed_at ? ticket.completed_at.toISOString().split("T")[0] : "",
				rate_type:        rateType,
				billable_hours:   billableHours,
				rate,
				currency:         cur,
				subtotal,
				discount_percent: discountPct,
				discount_amount:  discountAmt,
				net_total:        netTotal,
				client_id:        ticket.client?.id ?? null,
				client_name:      clientName,
				client_email:     ticket.client?.email ?? ticket.client_email ?? null,
				billing_cycle:    ticket.client?.billing_cycle ?? "per_ticket",
				payment_terms:    ticket.client?.payment_terms ?? "net_30",
			};
		});

		// Invoice number
		const today      = new Date();
		const yyyymmdd   = today.toISOString().slice(0, 10).replace(/-/g, "");
		const slug       = (orgFull?.slug ?? "ORG").toUpperCase();
		const todayStart = new Date(`${today.toISOString().slice(0, 10)}T00:00:00.000Z`);
		const todayEnd   = new Date(`${today.toISOString().slice(0, 10)}T23:59:59.999Z`);
		const existingCount = await prisma.invoice.count({ where: { org_id: orgId, generated_at: { gte: todayStart, lte: todayEnd } } });
		const seq = String(existingCount + 1).padStart(3, "0");
		const invoiceNumber = `TW-${slug}-${yyyymmdd}-${seq}`;
		const issueDate = today.toISOString().split("T")[0];

		const invoiceData: InvoiceData = {
			type,
			lineItems,
			invoiceNumber,
			issueDate,
			orgName: org_name ?? "Organization",
			orgLogoUrl: orgFull?.logo_url ?? undefined,
			dateFrom: date_from,
			dateTo: date_to,
		};

		// Save invoice record
		await prisma.invoice.create({
			data: {
				org_id: orgId,
				invoice_number: invoiceNumber,
				type,
				client_id: type === "client" ? client_id : null,
				date_from: fromDate,
				date_to: toDate,
			},
		});

		// ── Render ──────────────────────────────────────────────────────────────
		if (template.format === "pdf" && template.buildPdf) {
			const pdfBuffer = await template.buildPdf(invoiceData, config);
			return new Response(pdfBuffer, {
				headers: {
					"Content-Type": "application/pdf",
					"Content-Disposition": `attachment; filename="invoice-${invoiceNumber}.pdf"`,
				},
			});
		}

		// XLSX (default)
		const wb = new ExcelJS.Workbook();
		wb.creator  = org_name ?? "Tickworks";
		wb.created  = today;
		wb.modified = today;

		const xlsxTemplate = template.buildXlsx
			? template
			: TEMPLATES.find((t) => t.format === "xlsx")!;

		await xlsxTemplate.buildXlsx!(wb, invoiceData, config);

		const buffer = await wb.xlsx.writeBuffer();
		return new Response(buffer, {
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": `attachment; filename="invoice-${invoiceNumber}.xlsx"`,
			},
		});
	} catch (err) {
		console.error("[reports/invoice/export:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
