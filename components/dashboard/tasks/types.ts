export interface Task {
	id: string;
	created_by: string;
	user_id: string | null;
	title: string;
	description?: string | null;
	status: "pending" | "assigned" | "in_progress" | "completed";
	priority?: "low" | "medium" | "high" | null;
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
