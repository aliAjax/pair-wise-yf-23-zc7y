export interface ReconciliationResultItem {
  id: number;
  reconciliation_id: number;
  timeline_track_id: number;
  cue_scene_id: number;
  status: string;
  planned_start_ms: number;
  actual_trigger_ms: number;
  delay_ms: number;
  detail: string;
  batch_index: number;
}
