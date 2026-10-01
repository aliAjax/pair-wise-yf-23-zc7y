import type { ReconciliationRecord } from "../types/ReconciliationRecord";

export const createDefaultReconciliationRecord = (overrides: Partial<ReconciliationRecord> = {}): ReconciliationRecord => ({
  id: 0,
  show_project_id: 0,
  orchestration_fingerprint: "",
  status: "PENDING",
  total_count: 0,
  processed_count: 0,
  matched_count: 0,
  missed_count: 0,
  overtime_count: 0,
  overridden_count: 0,
  extra_count: 0,
  capacity: 200,
  current_batch: 0,
  total_batches: 0,
  started_at: new Date(0).toISOString(),
  completed_at: "",
  error: "",
  ...overrides
});

export const createReconciliationRecordForm = createDefaultReconciliationRecord;
export const createReconciliationRecordResponse = createDefaultReconciliationRecord;
