import axiosService from "./axios";

const apiVersion = "v1";

/**
 * Typed API client. All requests go through the Axios singleton
 * which handles 401 redirects and credentials automatically.
 */
class APIService {
	private static instance: APIService;

	private constructor() {}

	public static getInstance(): APIService {
		if (!APIService.instance) {
			APIService.instance = new APIService();
		}
		return APIService.instance;
	}

	// ---------------------------------------------------------------------------
	// Users
	// ---------------------------------------------------------------------------
	public users = {
		me: () => axiosService.get(`${apiVersion}/users/me`),
		getMeta: () => axiosService.get(`${apiVersion}/users/meta`),
		updateMeta: (data: {
			phone?: string;
			dob?: string;
			address?: string;
			passport_number?: string;
			visa_status?: string;
			visa_expiry?: string;
		}) => axiosService.patch(`${apiVersion}/users/meta`, data),
	};

	// ---------------------------------------------------------------------------
	// Auth
	// ---------------------------------------------------------------------------
	public auth = {
		register: (data: any) =>
			axiosService.post(`/auth/${apiVersion}/register`, data),
		callback: () => `${window.location.origin}/api/${apiVersion}/auth/callback`,
		resetPassword: () =>
			`${window.location.origin}/api/${apiVersion}/auth/callback?next=/reset-password`,
	};

	// ---------------------------------------------------------------------------
	// Employees
	// ---------------------------------------------------------------------------
	public employees = {
		list: (page = 1, limit = 10) =>
			axiosService.get(`${apiVersion}/employees`, { page, limit }),
		workload: () =>
			axiosService.get<Record<string, number>>(`${apiVersion}/employees/workload`),
		get: (id: string) => axiosService.get(`${apiVersion}/employees/${id}`),
		create: (data: {
			name: string;
			email: string;
			password: string;
			role: string;
		}) => axiosService.post(`${apiVersion}/employees`, data),
		update: (id: string, data: { name?: string; role?: string }) =>
			axiosService.put(`${apiVersion}/employees/${id}`, data),
		updateMeta: (
			id: string,
			data: {
				phone?: string | null;
				dob?: string | null;
				address?: string | null;
				passport_number?: string | null;
				visa_status?: string | null;
				visa_expiry?: string | null;
				salary?: number | null;
				date_joined?: string | null;
				sick_leave?: number | null;
				vacation_leave?: number | null;
				emergency_leave?: number | null;
				personal_leave?: number | null;
			},
		) => axiosService.patch(`${apiVersion}/employees/${id}`, data),
		remove: (id: string) =>
			axiosService.delete(`${apiVersion}/employees/${id}`),
	};

	// ---------------------------------------------------------------------------
	// Time Tracker
	// ---------------------------------------------------------------------------
	public time = {
		start: (data?: { title?: string; ticket_id?: string }) => axiosService.post(`${apiVersion}/time`, data ?? {}),
		active: () => axiosService.get(`${apiVersion}/time/active`),
		stop: (id: string, data: { title?: string; description?: string }) =>
			axiosService.patch(`${apiVersion}/time/${id}`, data),
		list: (page = 1, limit = 10, from?: string, to?: string, tzOffset?: number) =>
			axiosService.get(`${apiVersion}/time`, { page, limit, from, to, tz_offset: tzOffset }),
		summary: (from: string, to: string, userId?: string, tzOffset?: number) =>
			axiosService.get(`${apiVersion}/time/summary`, {
				from,
				to,
				user_id: userId,
				tz_offset: tzOffset,
			}),
		teamSummary: (from: string, to: string, tzOffset?: number) =>
			axiosService.get(`${apiVersion}/time/team-summary`, {
				from,
				to,
				tz_offset: tzOffset,
			}),
	};

	// ---------------------------------------------------------------------------
	// Tickets (canonical — old /task routes kept for backward compat)
	// ---------------------------------------------------------------------------
	public tasks = {
		list: (page = 1, limit = 10, status?: string, search?: string, view?: string, filters?: {
			type?: string; priority?: string; assignee?: string; due?: string;
		}) =>
			axiosService.get(`${apiVersion}/ticket`, { page, limit, status, search, view, ...filters }),
		create: (data: {
			title: string;
			description?: string;
			priority?: string;
			due_date?: string;
			assigned_to?: string;
			ticket_type?: string;
			client_name?: string;
			estimated_hours?: number;
			billable_hours?: number;
			implementation_plan?: string;
			rollback_plan?: string;
			links?: { url: string; label?: string }[];
		}) => axiosService.post(`${apiVersion}/ticket`, data),
		update: (id: string, data: object) =>
			axiosService.patch(`${apiVersion}/ticket/${id}`, data),
		remove: (id: string) => axiosService.delete(`${apiVersion}/ticket/${id}`),
		get: (id: string) => axiosService.get(`${apiVersion}/ticket/${id}`),
		assign: (id: string, user_id: string) =>
			axiosService.patch(`${apiVersion}/ticket/${id}/assign`, { user_id }),
		claim: (id: string) =>
			axiosService.patch(`${apiVersion}/ticket/${id}/claim`, {}),
		start: (id: string) =>
			axiosService.patch(`${apiVersion}/ticket/${id}/start`, {}),
		complete: (id: string) =>
			axiosService.patch(`${apiVersion}/ticket/${id}/complete`, {}),
		reopen: (id: string) =>
			axiosService.patch(`${apiVersion}/ticket/${id}/reopen`, {}),
		hold: (id: string) =>
			axiosService.patch(`${apiVersion}/ticket/${id}/hold`, {}),
		stale: (id: string) =>
			axiosService.patch(`${apiVersion}/ticket/${id}/stale`, {}),
		requestTransfer: (id: string, requested_to?: string) =>
			axiosService.post(`${apiVersion}/ticket/${id}/request-transfer`, { requested_to }),
		comments: {
			list: (taskId: string) =>
				axiosService.get(`${apiVersion}/ticket/${taskId}/comments`),
			post: (taskId: string, body: string) =>
				axiosService.post(`${apiVersion}/ticket/${taskId}/comments`, { body }),
			remove: (taskId: string, commentId: string) =>
				axiosService.delete(`${apiVersion}/ticket/${taskId}/comments/${commentId}`),
			clear: (taskId: string) =>
				axiosService.delete(`${apiVersion}/ticket/${taskId}/comments/clear`),
		},
		reactions: {
			list: (taskId: string, commentId: string) =>
				axiosService.get(`${apiVersion}/ticket/${taskId}/comments/${commentId}/reactions`),
			toggle: (taskId: string, commentId: string, emoji: string) =>
				axiosService.post(`${apiVersion}/ticket/${taskId}/comments/${commentId}/reactions`, { emoji }),
		},
		watchers: {
			list: (taskId: string) =>
				axiosService.get(`${apiVersion}/ticket/${taskId}/watchers`),
			watch: (taskId: string) =>
				axiosService.post(`${apiVersion}/ticket/${taskId}/watchers`, {}),
			unwatch: (taskId: string) =>
				axiosService.delete(`${apiVersion}/ticket/${taskId}/watchers`),
		},
		subtasks: {
			list: (taskId: string) =>
				axiosService.get(`${apiVersion}/ticket/${taskId}/subtasks`),
			create: (taskId: string, title: string) =>
				axiosService.post(`${apiVersion}/ticket/${taskId}/subtasks`, { title }),
			update: (taskId: string, subtaskId: string, data: { title?: string; completed?: boolean; position?: number }) =>
				axiosService.patch(`${apiVersion}/ticket/${taskId}/subtasks/${subtaskId}`, data),
			remove: (taskId: string, subtaskId: string) =>
				axiosService.delete(`${apiVersion}/ticket/${taskId}/subtasks/${subtaskId}`),
		},
		approve: (id: string) =>
			axiosService.patch(`${apiVersion}/ticket/${id}/approve`, {}),
		reject: (id: string, reason?: string) =>
			axiosService.patch(`${apiVersion}/ticket/${id}/reject`, { reason }),
		bulk: (action: "assign" | "complete" | "delete", ids: string[], user_id?: string) =>
			axiosService.post(`${apiVersion}/ticket/bulk`, { action, ids, user_id }),
	};

	// ---------------------------------------------------------------------------
	// Leave Requests
	// ---------------------------------------------------------------------------
	public requests = {
		list: (page = 1, limit = 10, status?: string) =>
			axiosService.get(`${apiVersion}/request`, { page, limit, status }),
		create: (data: {
			startDate: string;
			endDate: string;
			type: string;
			reason?: string;
		}) => axiosService.post(`${apiVersion}/request`, data),
		approve: (id: string, data?: { reason?: string }) =>
			axiosService.patch(`${apiVersion}/request/${id}/approve`, data ?? {}),
		reject: (id: string, data?: { reason?: string }) =>
			axiosService.patch(`${apiVersion}/request/${id}/reject`, data ?? {}),
		cancel: (id: string, data?: { reason?: string }) =>
			axiosService.patch(`${apiVersion}/request/${id}/cancel`, data ?? {}),
		remove: (id: string) => axiosService.delete(`${apiVersion}/request/${id}`),
		bulkDelete: (ids: string[]) =>
			axiosService.post(`${apiVersion}/request/bulk-delete`, { ids }),
	};

	// ---------------------------------------------------------------------------
	// Reports (admin only)
	// ---------------------------------------------------------------------------
	public reports = {
		summary: () => axiosService.get(`${apiVersion}/reports`),
	};

	// ---------------------------------------------------------------------------
	// Payments
	// ---------------------------------------------------------------------------
	public payments = {
		checkout: (plan: "Pro") =>
			axiosService.post(`${apiVersion}/payments/checkout`, { plan }),
		portal: () => axiosService.post(`${apiVersion}/payments/portal`),
	};

	// ---------------------------------------------------------------------------
	// Notifications
	// ---------------------------------------------------------------------------
	public notifications = {
		list: (page = 1, limit = 20, unread_only = false) =>
			axiosService.get(`${apiVersion}/notifications`, { page, limit, unread_only }),
		readAll: () =>
			axiosService.patch(`${apiVersion}/notifications/read-all`, {}),
		read: (id: string) =>
			axiosService.patch(`${apiVersion}/notifications/${id}/read`, {}),
		bulkRead: (ids: string[]) =>
			axiosService.patch(`${apiVersion}/notifications`, { ids }),
		bulkDelete: (ids: string[]) =>
			axiosService.delete(`${apiVersion}/notifications`, undefined, { ids }),
	};

	// ---------------------------------------------------------------------------
	// Dashboard (role-aware)
	// ---------------------------------------------------------------------------
	public dashboard = {
		// Pass the client's local date so the server builds the 7-day window
		// relative to the user's timezone, not the UTC server clock.
		get: () =>
			axiosService.get(
				`${apiVersion}/dashboard?date=${new Date().toLocaleDateString("en-CA")}`,
			),
	};

	// ---------------------------------------------------------------------------
	// Performance (admin only)
	// ---------------------------------------------------------------------------
	public performance = {
		list: (from: string, to: string) =>
			axiosService.get(`${apiVersion}/performance`, { from, to }),
	};
}

export default APIService.getInstance();
