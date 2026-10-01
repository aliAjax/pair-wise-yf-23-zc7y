export interface ConsoleExecutionRecord {
  id: number;
  console_cue_id: string;
  cue_scene_id: number | null;
  triggered_at_ms: number;
  fixture_channel_snapshot: string;
  snapshot_missing: string;
  received_at: string;
}
