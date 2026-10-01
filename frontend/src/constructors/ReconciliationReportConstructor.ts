import type { ClockAlignment, ReconciliationBatch, ReconciliationReport } from "../types/ReconciliationReport";
import {
  RECONCILIATION_BATCH_SIZE,
  RECONCILIATION_DEFAULT_TOLERANCE_MS
} from "../constants/reconciliationConfig";

export const createDefaultClockAlignment = (
  overrides: Partial<ClockAlignment> = {}
): ClockAlignment => ({
  show_started_at: "",
  console_clock_at_show_start: "",
  tolerance_ms: RECONCILIATION_DEFAULT_TOLERANCE_MS,
  ...overrides
});

export const createClockAlignmentForm = createDefaultClockAlignment;

export const createReconciliationBatch = (
  overrides: Partial<ReconciliationBatch> & { index: number }
): ReconciliationBatch => ({
  status: "PENDING",
  attempts: 0,
  error: "",
  entry_ids: [],
  ...overrides
});

export const createDefaultReconciliationReport = (
  overrides: Partial<ReconciliationReport> = {}
): ReconciliationReport => ({
  id: 0,
  created_at: "",
  alignment: createDefaultClockAlignment(),
  schedule_signature: "",
  batch_size: RECONCILIATION_BATCH_SIZE,
  clock_offset_ms: 0,
  entries: [],
  batches: [],
  stale: false,
  ...overrides
});

export const createReconciliationReportForm = createDefaultReconciliationReport;
export const createReconciliationReportResponse = createDefaultReconciliationReport;
