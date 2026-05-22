const BASE = import.meta.env.VITE_API_URL ?? "https://tickworks.app";
const API  = `${BASE}/api/v1`;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err?.error ?? res.statusText), { status: res.status });
  }
  return res.json();
}

// Auth / session
export const getActiveTimer  = () => req<ActiveTimer | null>("/time/active");
export const getOrgSettings  = () => req<OrgSettings>("/org/settings");
export const getMe           = () => req<Me>("/users/me");
export const getTodaySummary = () => {
  const today = new Date().toISOString().slice(0, 10);
  const tz = new Date().getTimezoneOffset();
  return req<{ totalMs: number }>(`/time/summary?from=${today}&to=${today}&tz_offset=${tz}`);
};

export const getWeekSummary = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const from = monday.toISOString().slice(0, 10);
  const to   = now.toISOString().slice(0, 10);
  const tz   = now.getTimezoneOffset();
  return req<{ totalMs: number }>(`/time/summary?from=${from}&to=${to}&tz_offset=${tz}`);
};

// Timer
export const startTimer = (data?: { title?: string; ticket_id?: string }) =>
  req<ActiveTimer>("/time", { method: "POST", body: JSON.stringify(data ?? {}) });
export const stopTimer = (id: string, title?: string) =>
  req("/time/" + id, { method: "PATCH", body: JSON.stringify({ end_time: new Date().toISOString(), ...(title ? { title } : {}) }) });

// Time logs
export const getTimeEntries = () => {
  const today = new Date().toISOString().slice(0, 10);
  const tz = new Date().getTimezoneOffset();
  return req<TimeEntryList>(`/time?from=${today}&to=${today}&tz_offset=${tz}&limit=50`);
};
export const updateTimeEntry = (id: string, data: { title?: string; start_time?: string; end_time?: string }) =>
  req<TimeEntry>("/time/" + id, { method: "PUT", body: JSON.stringify(data) });
export const deleteTimeEntry = (id: string) =>
  req("/time/" + id, { method: "DELETE" });

// Tickets
export const getMyTickets = (page = 1) =>
  req<TicketList>(`/ticket?view=assigned&page=${page}&limit=20`);
export const getAvailableTickets = (isAdmin = false, page = 1) =>
  req<TicketList>(`/ticket?view=${isAdmin ? "all" : "unassigned"}&page=${page}&limit=20`);
export const claimTicket    = (id: string) => req(`/ticket/${id}/claim`, { method: "PATCH", body: "{}" });
export const createTicket   = (data: CreateTicketData) =>
  req<Ticket>("/ticket", { method: "POST", body: JSON.stringify(data) });
export const updateTicketStatus = (id: string, action: "start" | "complete" | "hold" | "reopen") =>
  req(`/ticket/${id}/${action}`, { method: "PATCH", body: "{}" });
export const updateBillableHours = (id: string, billable_hours: number | null) =>
  req(`/task/${id}/billable`, { method: "PATCH", body: JSON.stringify({ billable_hours }) });
export const requestTransfer = (id: string, reason?: string) =>
  req(`/ticket/${id}/transfer-request`, { method: "POST", body: JSON.stringify({ reason: reason ?? "" }) });
export const requestReopen = (id: string, reason?: string) =>
  req(`/ticket/${id}/reopen-request`, { method: "POST", body: JSON.stringify({ reason: reason ?? "" }) });
export const requestDueDateExtension = (id: string, requested_date: string, reason?: string) =>
  req(`/ticket/${id}/due-date-request`, { method: "POST", body: JSON.stringify({ requested_date, reason: reason ?? "" }) });

// Types
export interface ActiveTimer {
  id: string;
  title: string | null;
  start_time: string;
  ticket_id: string | null;
}

export interface OrgSettings {
  extension_enabled: boolean;
  name: string;
  plan: string;
  is_internal: boolean;
}

export interface Me {
  id: string;
  name: string | null;
  email: string;
  role: string;
  org_id: string;
}

export interface TimeEntry {
  id: string;
  title: string | null;
  start_time: string;
  end_time: string | null;
}

export interface TimeEntryList {
  data: TimeEntry[];
  page: number;
  totalPages: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  ticket_type: string | null;
  due_date: string | null;
  created_at: string;
  user_id: string | null;
  client_id: string | null;
  client_name: string | null;
  client_rate_type: string | null;
  assignee: { id: string; name: string | null; email: string } | null;
  transferRequests: { id: string }[];
  reopenRequests: { id: string }[];
}

export const getTicket = (id: string) => req<Ticket>(`/ticket/${id}`);

export interface TicketList {
  data: Ticket[];
  page: number;
  totalPages: number;
}

export interface CreateTicketData {
  title: string;
  description?: string;
  priority?: string;
  due_date?: string;
  ticket_type?: string;
  client_id?: string | null;
  client_name?: string | null;
}

export interface Client {
  id: string;
  name: string;
  deleted_at: string | null;
}

export const getClients = () => req<{ data: Client[] }>("/clients");
