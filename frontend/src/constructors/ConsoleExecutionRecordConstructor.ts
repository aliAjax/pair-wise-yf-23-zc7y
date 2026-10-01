import type { ConsoleExecutionRecord } from "../types/ConsoleExecutionRecord";

export const createDefaultConsoleExecutionRecord = (overrides: Partial<ConsoleExecutionRecord> = {}): ConsoleExecutionRecord => ({
  id: 0,
  console_cue_id: "",
  cue_scene_id: null,
  triggered_at_ms: 0,
  fixture_channel_snapshot: "{}",
  snapshot_missing: "false",
  received_at: new Date(0).toISOString(),
  ...overrides
});

export const createConsoleExecutionRecordForm = createDefaultConsoleExecutionRecord;
export const createConsoleExecutionRecordResponse = createDefaultConsoleExecutionRecord;
