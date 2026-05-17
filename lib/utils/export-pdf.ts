import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDurationMs } from "./format";

const BRAND: [number, number, number] = [52, 168, 83]; // mint-ish green
const GRAY: [number, number, number]  = [100, 100, 100];

function header(doc: jsPDF, title: string, subtitle: string) {
	doc.setFontSize(16);
	doc.setTextColor(30, 30, 30);
	doc.text(title, 14, 18);
	doc.setFontSize(9);
	doc.setTextColor(...GRAY);
	doc.text(subtitle, 14, 25);
}

export interface PerformanceEntry {
	user: { id: string; name: string | null; email: string };
	tasks_completed: number;
	tasks_in_progress: number;
	tasks_total: number;
	completion_rate: number;
	avg_days_to_complete: number;
	time_this_period_ms: number;
}

export interface EmployeeReportData {
	employee: { id: string; name: string | null; email: string };
	tickets: {
		id: string;
		title: string;
		ticket_type: string | null;
		status: string;
		priority: string | null;
		due_date: string | null;
		started_at: string | null;
		completed_at: string | null;
	}[];
	timeEntries: {
		id: string;
		ticket_id: string | null;
		start_time: string;
		end_time: string | null;
		title: string | null;
		auto_closed: boolean;
	}[];
	totalMs: number;
	completed: number;
}

export function exportAllPdf(data: PerformanceEntry[], from: string, to: string) {
	const doc = new jsPDF({ orientation: "landscape" });

	header(doc, "Employee Performance Report", `Period: ${from} to ${to}`);

	autoTable(doc, {
		startY: 32,
		head: [["Employee", "Email", "Completed", "In Progress", "Total", "Rate", "Avg Days", "Time Logged"]],
		body: data.map((e) => [
			e.user.name ?? "",
			e.user.email,
			e.tasks_completed,
			e.tasks_in_progress,
			e.tasks_total,
			`${Math.round(e.completion_rate * 100)}%`,
			e.avg_days_to_complete > 0 ? `${e.avg_days_to_complete}d` : "—",
			e.time_this_period_ms > 0 ? formatDurationMs(e.time_this_period_ms) : "—",
		]),
		styles: { fontSize: 8, cellPadding: 3 },
		headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 8 },
		alternateRowStyles: { fillColor: [245, 250, 245] },
	});

	doc.save(`report-all-${from}-to-${to}.pdf`);
}

export function exportEmployeePdf(report: EmployeeReportData, from: string, to: string) {
	const doc = new jsPDF();
	const name = report.employee.name ?? report.employee.email;

	header(doc, `Employee Report — ${name}`, `${report.employee.email} · Period: ${from} to ${to}`);

	// Summary block
	autoTable(doc, {
		startY: 32,
		body: [
			["Tickets Completed", String(report.completed)],
			["Total Time Logged", report.totalMs > 0 ? formatDurationMs(report.totalMs) : "—"],
		],
		styles: { fontSize: 8, cellPadding: 3 },
		theme: "plain",
		columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
	});

	// Tickets table
	const ticketsY = (doc as any).lastAutoTable?.finalY ?? 60;
	doc.setFontSize(10);
	doc.setTextColor(30, 30, 30);
	doc.text("Tickets", 14, ticketsY + 10);

	autoTable(doc, {
		startY: ticketsY + 14,
		head: [["Title", "Type", "Status", "Priority", "Due Date", "Completed"]],
		body: report.tickets.map((t) => [
			t.title,
			t.ticket_type ?? "—",
			t.status,
			t.priority ?? "—",
			t.due_date ? new Date(t.due_date).toLocaleDateString() : "—",
			t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "—",
		]),
		styles: { fontSize: 7.5, cellPadding: 2.5 },
		headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 7.5 },
		alternateRowStyles: { fillColor: [245, 250, 245] },
	});

	// Time entries table
	const timeY = (doc as any).lastAutoTable?.finalY ?? 120;
	doc.setFontSize(10);
	doc.setTextColor(30, 30, 30);
	doc.text("Time Entries", 14, timeY + 10);

	autoTable(doc, {
		startY: timeY + 14,
		head: [["Date", "Start", "End", "Duration", "Ticket", "Auto-closed"]],
		body: report.timeEntries.map((e) => {
			const start = new Date(e.start_time);
			const end   = e.end_time ? new Date(e.end_time) : null;
			const ms    = end ? end.getTime() - start.getTime() : 0;
			const linked = report.tickets.find((t) => t.id === e.ticket_id);
			return [
				start.toLocaleDateString(),
				start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
				end ? end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
				ms > 0 ? formatDurationMs(ms) : "—",
				linked?.title ?? e.title ?? "—",
				e.auto_closed ? "Yes" : "No",
			];
		}),
		styles: { fontSize: 7.5, cellPadding: 2.5 },
		headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 7.5 },
		alternateRowStyles: { fillColor: [245, 250, 245] },
	});

	doc.save(`report-${name.replace(/\s+/g, "-")}-${from}-to-${to}.pdf`);
}
