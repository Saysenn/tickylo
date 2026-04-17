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
		start: (data?: { title?: string }) => axiosService.post(`${apiVersion}/time`, data ?? {}),
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
	// Tasks
	// ---------------------------------------------------------------------------
	public tasks = {
		list: (page = 1, limit = 10, status?: string, search?: string, view?: string) =>
			axiosService.get(`${apiVersion}/task`, { page, limit, status, search, view }),
		create: (data: {
			title: string;
			description?: string;
			priority?: string;
			due_date?: string;
			assigned_to?: string;
		}) => axiosService.post(`${apiVersion}/task`, data),
		update: (id: string, data: object) =>
			axiosService.patch(`${apiVersion}/task/${id}`, data),
		remove: (id: string) => axiosService.delete(`${apiVersion}/task/${id}`),
		get: (id: string) => axiosService.get(`${apiVersion}/task/${id}`),
		assign: (id: string, user_id: string) =>
			axiosService.patch(`${apiVersion}/task/${id}/assign`, { user_id }),
		claim: (id: string) =>
			axiosService.patch(`${apiVersion}/task/${id}/claim`, {}),
		start: (id: string) =>
			axiosService.patch(`${apiVersion}/task/${id}/start`, {}),
		complete: (id: string) =>
			axiosService.patch(`${apiVersion}/task/${id}/complete`, {}),
		requestTransfer: (id: string, requested_to?: string) =>
			axiosService.post(`${apiVersion}/task/${id}/request-transfer`, { requested_to }),
		comments: {
			list: (taskId: string) =>
				axiosService.get(`${apiVersion}/task/${taskId}/comments`),
			post: (taskId: string, body: string) =>
				axiosService.post(`${apiVersion}/task/${taskId}/comments`, { body }),
			remove: (taskId: string, commentId: string) =>
				axiosService.delete(`${apiVersion}/task/${taskId}/comments/${commentId}`),
			clear: (taskId: string) =>
				axiosService.delete(`${apiVersion}/task/${taskId}/comments/clear`),
		},
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
