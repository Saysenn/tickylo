export interface TimeSummaryDay {
	date: string;
	totalMs: number;
}

export interface TimeSummary {
	from: string;
	to: string;
	totalMs: number;
	daysWorked: number;
	days: TimeSummaryDay[];
}
