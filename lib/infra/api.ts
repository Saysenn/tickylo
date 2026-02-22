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
