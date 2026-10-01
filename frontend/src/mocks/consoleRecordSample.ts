import type { ConsoleExecutionRecord } from "../types/ConsoleExecutionRecord";

export const sampleConsoleRecords: ConsoleExecutionRecord[] = [
  {
    id: 1,
    console_cue_id: "CUE-1",
    cue_scene_id: 1,
    triggered_at_ms: 12000,
    fixture_channel_snapshot: JSON.stringify({ "1": { dimmer: 255, color: "#ffcc00" } }),
    snapshot_missing: "false",
    received_at: "2026-10-01T09:00:12Z"
  },
  {
    id: 2,
    console_cue_id: "CUE-2",
    cue_scene_id: 2,
    triggered_at_ms: 24800,
    fixture_channel_snapshot: JSON.stringify({ "2": { dimmer: 200, color: "#3366ff" } }),
    snapshot_missing: "false",
    received_at: "2026-10-01T09:00:24Z"
  },
  {
    id: 3,
    console_cue_id: "CUE-3",
    cue_scene_id: 3,
    triggered_at_ms: 41500,
    fixture_channel_snapshot: "",
    snapshot_missing: "true",
    received_at: "2026-10-01T09:00:41Z"
  },
  {
    id: 4,
    console_cue_id: "CUE-4",
    cue_scene_id: 99,
    triggered_at_ms: 52000,
    fixture_channel_snapshot: JSON.stringify({ "1": { dimmer: 128 } }),
    snapshot_missing: "false",
    received_at: "2026-10-01T09:00:52Z"
  }
];

export const sampleShowStartConsoleMs = 10000;
