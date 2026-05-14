export interface TimeEntry {
  id: string;
  user_id: string;
  ticket_id: string | null;
  start_time: string;
  end_time: string | null;
  title: string | null;
  description: string | null;
  auto_closed: boolean;
  flagged: boolean;
  created_at: string;
  updated_at: string;
  ticket?: { id: string; title: string; ticket_type: string } | null;
}

export interface TimeEntryPage {
  data: TimeEntry[];
  page: number;
  totalPages: number;
}
