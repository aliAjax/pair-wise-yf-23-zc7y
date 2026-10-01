import type { ConsoleExecutionRecord } from "../types/ConsoleExecutionRecord";

export const createDefaultConsoleExecutionRecord = (
  overrides: Partial<ConsoleExecutionRecord> = {}
): ConsoleExecutionRecord => ({
  seq: 0,
  cue_no: "",
  cue_name: "",
  cue_scene_id: null,
  raw_time: "",
  elapsed_ms: null,
  channels: null,
  raw_line: "",
  ...overrides
});

export const createConsoleExecutionRecordForm = createDefaultConsoleExecutionRecord;
export const createConsoleExecutionRecordResponse = createDefaultConsoleExecutionRecord;
