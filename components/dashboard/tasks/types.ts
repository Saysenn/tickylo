export type TicketType = "internal_task" | "request" | "incident" | "change";
export type TicketStatus = "needs_approval" | "pending" | "assigned" | "in_progress" | "on_hold" | "stale" | "completed" | "closed" | "rejected";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface TicketLink {
	url: string;
	label?: string;
}

export interface Task {
	id: string;
	created_by: string;
	user_id: string | null;
	title: string;
	description?: string | null;
	status: TicketStatus;
	priority?: TicketPriority | null;
	ticket_type: TicketType;
	client_name?: string | null;
	estimated_hours?: number | null;
	billable_hours?: number | null;
	implementation_plan?: string | null;
	rollback_plan?: string | null;
	related_to?: string | null;
	links?: TicketLink[] | null;
	due_date?: string | null;
	assigned_at?: string | null;
	completed_at?: string | null;
	started_at?: string | null;
	created_at: string;
	assignee?: { id: string; name: string | null; email: string } | null;
}

export interface TaskPage {
	data: Task[];
	page: number;
	totalPages: number;
}
