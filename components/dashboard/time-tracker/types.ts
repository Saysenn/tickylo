export interface TimeEntry {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryPage {
  data: TimeEntry[];
  page: number;
  totalPages: number;
}
