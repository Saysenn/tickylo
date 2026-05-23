export function currency(val: number, cur: string) {
	return `${cur} ${val.toFixed(2)}`;
}

export function paymentTermsLabel(terms: string): string {
	const map: Record<string, string> = {
		due_on_receipt: "Due on Receipt",
		net_15:  "Net 15 days",
		net_30:  "Net 30 days",
		net_60:  "Net 60 days",
	};
	return map[terms] ?? terms;
}

export function billingCycleLabel(cycle: string): string {
	const map: Record<string, string> = {
		per_ticket:  "Per Ticket",
		monthly:     "Monthly",
		per_project: "Per Project",
	};
	return map[cycle] ?? cycle;
}

export function rateTypeLabel(rt: string): string {
	return rt === "fixed" ? "Fixed" : rt === "hourly" ? "Hourly" : rt;
}

export function dueDateFrom(terms: string, issueDate: Date): string {
	const d = new Date(issueDate);
	const days: Record<string, number> = { net_15: 15, net_30: 30, net_60: 60 };
	if (terms === "due_on_receipt") return d.toISOString().split("T")[0];
	d.setDate(d.getDate() + (days[terms] ?? 30));
	return d.toISOString().split("T")[0];
}
