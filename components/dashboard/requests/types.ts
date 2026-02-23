export interface LeaveRequest {
	id: string;
	user_id: string;
	start: string;
	end: string;
	type: "sick" | "vacation" | "emergency";
	status: "pending" | "approved" | "rejected" | "cancelled";
	reason?: string | null;
	created_at: string;
	user?: { id: string; name: string | null; email: string };
}

export interface LeaveRequestPage {
	data: LeaveRequest[];
	page: number;
	totalPages: number;
	total: number;
}
