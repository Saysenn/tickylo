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
		getMe: () => axiosService.get(`${apiVersion}/users/me`),
		updateTimezone: (timezone: string) =>
			axiosService.patch(`${apiVersion}/users/me`, { timezone }),
		updateShift: (shift_start: string | null, shift_end: string | null) =>
			axiosService.patch(`${apiVersion}/users/me`, { shift_start, shift_end }),
		getMeta: () => axiosService.get(`${apiVersion}/users/meta`),
		updateMeta: (data: {
			phone?: string;
			dob?: string;
			address?: string;
			passport_number?: string;
			visa_status?: string;
			visa_expiry?: string;
		}) => axiosService.patch(`${apiVersion}/users/meta`, data),
		export: () => axiosService.instance.get(`/v1/users/export`, { responseType: "blob" }),
		requestDeletion: () => axiosService.post(`${apiVersion}/users/deletion-request`, {}),
		cancelDeletion: () => axiosService.delete(`${apiVersion}/users/deletion-request`),
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
		list: (page = 1, limit = 10, search?: string) =>
			axiosService.get(`${apiVersion}/employees`, { page, limit, search }),
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
		activeAll: () => axiosService.get(`${apiVersion}/time/active-all`),
		forceStop: (id: string) => axiosService.post(`${apiVersion}/time/${id}/force-stop`, {}),
		unflag: (id: string) => axiosService.post(`${apiVersion}/time/${id}/unflag`, {}),
		stop: (id: string, data: { title?: string; description?: string }) =>
			axiosService.patch(`${apiVersion}/time/${id}`, data),
		list: (page = 1, limit = 10, from?: string, to?: string, tzOffset?: number, userId?: string, flaggedOnly?: boolean) =>
			axiosService.get(`${apiVersion}/time`, { page, limit, from, to, tz_offset: tzOffset, user_id: userId || undefined, flagged_only: flaggedOnly || undefined }),
		summary: (from: string, to: string, userId?: string, tzOffset?: number) =>
			axiosService.get(`${apiVersion}/time/summary`, {
				from,
				to,
				user_id: userId,
				tz_offset: tzOffset,
			}),
		teamSummary: (from: string, to: string, tzOffset?: number, search?: string) =>
			axiosService.get(`${apiVersion}/time/team-summary`, {
				from,
				to,
				tz_offset: tzOffset,
				search: search || undefined,
			}),
		update: (id: string, data: { title?: string; description?: string; start_time?: string; end_time?: string }) =>
			axiosService.put(`${apiVersion}/time/${id}`, data),
		remove: (id: string) =>
			axiosService.delete(`${apiVersion}/time/${id}`),
		bulkDelete: (ids: string[]) =>
			axiosService.delete(`${apiVersion}/time/bulk`, undefined, { ids }),
		merge: (ids: string[], title?: string) =>
			axiosService.post(`${apiVersion}/time/merge`, { ids, title }),
		ticketEntries: (ticketId: string) =>
			axiosService.get(`${apiVersion}/ticket/${ticketId}/time`),
	};

	// ---------------------------------------------------------------------------
	// Tickets (canonical — old /task routes kept for backward compat)
	// ---------------------------------------------------------------------------
	public tasks = {
		stats: () => axiosService.get(`${apiVersion}/task/stats`),
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
			source?: string;
			assignee_permission?: string;
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
		updateBillable: (id: string, billable_hours: number | null) =>
			axiosService.patch(`${apiVersion}/ticket/${id}/billable`, { billable_hours }),
		comments: {
			list: (taskId: string) =>
				axiosService.get(`${apiVersion}/ticket/${taskId}/comments`),
			post: (taskId: string, body: string, attachmentIds?: string[]) =>
				axiosService.post(`${apiVersion}/ticket/${taskId}/comments`, { body, attachment_ids: attachmentIds }),
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
		requestReopen: (id: string) =>
			axiosService.post(`${apiVersion}/ticket/${id}/request-reopen`, {}),
		reopenRequest: {
			get:     (id: string) => axiosService.get(`${apiVersion}/ticket/${id}/request-reopen`),
			approve: (id: string) => axiosService.patch(`${apiVersion}/ticket/${id}/request-reopen/approve`, {}),
			reject:  (id: string, reason?: string) => axiosService.patch(`${apiVersion}/ticket/${id}/request-reopen/reject`, { reason }),
		},
		transferRequest: {
			get:     (id: string) => axiosService.get(`${apiVersion}/ticket/${id}/request-transfer`),
			approve: (id: string, assigneeId: string) => axiosService.patch(`${apiVersion}/ticket/${id}/request-transfer/approve`, { assignee_id: assigneeId }),
			reject:  (id: string, reason?: string) => axiosService.patch(`${apiVersion}/ticket/${id}/request-transfer/reject`, { reason }),
		},
		dueDateRequest: {
			get: (id: string) =>
				axiosService.get(`${apiVersion}/ticket/${id}/due-date-request`),
			create: (id: string, data: { requested_date: string; reason?: string }) =>
				axiosService.post(`${apiVersion}/ticket/${id}/due-date-request`, data),
			approve: (id: string) =>
				axiosService.patch(`${apiVersion}/ticket/${id}/due-date-request/approve`, {}),
			reject: (id: string, reason?: string) =>
				axiosService.patch(`${apiVersion}/ticket/${id}/due-date-request/reject`, { reason }),
		},
		bulk: (
			action: "assign" | "complete" | "delete" | "status" | "priority" | "due_date",
			ids: string[],
			payload?: { user_id?: string; status?: string; priority?: string; due_date?: string | null },
		) => axiosService.post(`${apiVersion}/ticket/bulk`, { action, ids, ...payload }),
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
	// Billing
	// ---------------------------------------------------------------------------
	public billing = {
		status: () => axiosService.get(`${apiVersion}/billing/status`),
		setup: (data: {
			plan: "business" | "enterprise";
			seat_count: number;
			interval: "monthly" | "annual";
			payment_method_id: string;
		}) => axiosService.post(`${apiVersion}/billing/setup`, data),
		portal: () => axiosService.post(`${apiVersion}/billing/portal`),
		updateSeats: (seat_count: number) =>
			axiosService.patch(`${apiVersion}/billing/seats`, { seat_count }),
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
		employeeReport: (userId: string, from: string, to: string) =>
			axiosService.get(`${apiVersion}/performance/employee-report`, { user_id: userId, from, to }),
	};

	// ---------------------------------------------------------------------------
	// Audit Logs (admin only — org-scoped)
	// ---------------------------------------------------------------------------
	public auditLogs = {
		list: (params?: { page?: number; limit?: number; action?: string; entity_type?: string; actor_id?: string; from?: string; to?: string }) =>
			axiosService.get(`${apiVersion}/audit-logs`, params ?? {}),
	};

	// ---------------------------------------------------------------------------
	// Org Settings
	// ---------------------------------------------------------------------------
	public orgSettings = {
		get: () => axiosService.get<{ attachments_enabled: boolean }>(`${apiVersion}/org/settings`),
		update: (data: { attachments_enabled: boolean }) => axiosService.patch(`${apiVersion}/org/settings`, data),
	};

	// ---------------------------------------------------------------------------
	// Storage Config (admin only)
	// ---------------------------------------------------------------------------
	public orgStorage = {
		get: () => axiosService.get(`${apiVersion}/org/storage`),
		update: (data: object) => axiosService.put(`${apiVersion}/org/storage`, data),
		test: (data: object) => axiosService.post(`${apiVersion}/org/storage`, data),
	};

	// ---------------------------------------------------------------------------
	// File Upload
	// ---------------------------------------------------------------------------
	public upload = {
		// Uses fetch directly — axios's default Content-Type: application/json header
		// would suppress the browser-generated multipart boundary, breaking form parsing.
		file: async (formData: FormData): Promise<{ id: string; url: string; file_name: string; mime_type: string; file_size: number }> => {
			const res = await fetch(`/api/${apiVersion}/upload`, {
				method: "POST",
				body: formData,
				credentials: "include",
			});
			if (!res.ok) {
				const json = await res.json().catch(() => ({}));
				throw Object.assign(new Error(json?.error ?? "Upload failed"), { response: { data: json } });
			}
			return res.json();
		},
	};

	// ---------------------------------------------------------------------------
	// Attachments
	// ---------------------------------------------------------------------------
	public attachments = {
		delete: (id: string) => axiosService.delete(`${apiVersion}/attachment/${id}`),
		byTicket: (ticketId: string) => axiosService.get(`${apiVersion}/ticket/${ticketId}/attachments`),
		deleteAllForTicket: (ticketId: string) => axiosService.delete(`${apiVersion}/ticket/${ticketId}/attachments`),
	};

	// ---------------------------------------------------------------------------
	// Work Schedule
	// ---------------------------------------------------------------------------
	public workSchedule = {
		get: () => axiosService.get(`${apiVersion}/work-schedule`),
		update: (data: {
			timezone: string;
			shift_start: string;
			shift_end: string;
			working_days: number[];
			daily_cap_h: number;
			max_timer_hours: number | null;
		}) => axiosService.put(`${apiVersion}/work-schedule`, data),
	};

	// ---------------------------------------------------------------------------
	// Ticket Requests (admin only)
	// ---------------------------------------------------------------------------
	public ticketRequests = {
		list: (params?: { page?: number; limit?: number; type?: string; search?: string }) =>
			axiosService.get(`${apiVersion}/ticket-requests`, params ?? {}),
	};

	// ---------------------------------------------------------------------------
	// Super Admin
	// ---------------------------------------------------------------------------
	public superAdmin = {
		getApplications: (status: string) =>
			axiosService.get(`${apiVersion}/super-admin/applications`, { status }),
		approveApplication: (id: string) =>
			axiosService.post(`${apiVersion}/super-admin/applications/${id}/approve`, {}),
		rejectApplication: (id: string, reason: string) =>
			axiosService.post(`${apiVersion}/super-admin/applications/${id}/reject`, { reason }),
		getOrgs: () =>
			axiosService.get(`${apiVersion}/super-admin/orgs`),
		toggleInternal: (orgId: string, is_internal: boolean) =>
			axiosService.patch(`${apiVersion}/super-admin/orgs/${orgId}`, { is_internal }),
	};

	// ---------------------------------------------------------------------------
	// Organization Apply / Join (public)
	// ---------------------------------------------------------------------------
	public org = {
		apply: (data: { company_name: string; admin_name: string; admin_email: string; password: string; reason?: string; accepted_privacy: true; accepted_terms: true }) =>
			axiosService.post(`/auth/apply`, data),
		checkJoinCode: (code: string) =>
			axiosService.get(`/auth/join/check`, { code }),
		join: (data: { org_join_code: string; name: string; email: string; password: string; accepted_privacy: true; accepted_terms: true }) =>
			axiosService.post(`/auth/join`, data),
	};
}

export default APIService.getInstance();
