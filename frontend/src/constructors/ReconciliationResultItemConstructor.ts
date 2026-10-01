import type { ReconciliationResultItem } from "../types/ReconciliationResultItem";

export const createDefaultReconciliationResultItem = (overrides: Partial<ReconciliationResultItem> = {}): ReconciliationResultItem => ({
  id: 0,
  reconciliation_id: 0,
  timeline_track_id: 0,
  cue_scene_id: 0,
  status: "MISSED",
  planned_start_ms: 0,
  actual_trigger_ms: -1,
  delay_ms: 0,
  detail: "",
  batch_index: 0,
  ...overrides
});

export const createReconciliationResultItemForm = createDefaultReconciliationResultItem;
export const createReconciliationResultItemResponse = createDefaultReconciliationResultItem;
