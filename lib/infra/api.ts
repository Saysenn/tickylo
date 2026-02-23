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
		get: (id: string) => axiosService.get(`${apiVersion}/employees/${id}`),
		create: (data: {
			name: string;
			email: string;
			password: string;
			role: string;
		}) => axiosService.post(`${apiVersion}/employees`, data),
		update: (id: string, data: { name?: string; role?: string }) =>
			axiosService.put(`${apiVersion}/employees/${id}`, data),
		remove: (id: string) =>
			axiosService.delete(`${apiVersion}/employees/${id}`),
	};

	// ---------------------------------------------------------------------------
	// Time Tracker
	// ---------------------------------------------------------------------------
	public time = {
		start: () => axiosService.post(`${apiVersion}/time`),
		active: () => axiosService.get(`${apiVersion}/time/active`),
		stop: (id: string, data: { title?: string; description?: string }) =>
			axiosService.patch(`${apiVersion}/time/${id}`, data),
		list: (page = 1, limit = 10) =>
			axiosService.get(`${apiVersion}/time`, { page, limit }),
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
		list: (page = 1, limit = 10, status?: string, search?: string) =>
			axiosService.get(`${apiVersion}/task`, { page, limit, status, search }),
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
}

export default APIService.getInstance();
