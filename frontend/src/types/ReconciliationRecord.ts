export interface ReconciliationRecord {
  id: number;
  show_project_id: number;
  orchestration_fingerprint: string;
  status: string;
  total_count: number;
  processed_count: number;
  matched_count: number;
  missed_count: number;
  overtime_count: number;
  overridden_count: number;
  extra_count: number;
  capacity: number;
  current_batch: number;
  total_batches: number;
  started_at: string;
  completed_at: string;
  error: string;
}
