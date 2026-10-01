import type { ReconciliationStatus } from "./ReconciliationStatus";

/**
 * 灯控台导出的一条执行记录。
 * raw_time 为控台时钟原文（HH:MM:SS.mmm 或 ISO 字符串）；
 * elapsed_ms 是按演出开始时间对齐后的相对毫秒。
 * channels 为控台附带的灯具通道快照，旧版本导出可能缺失，读取时必须兼容。
 */
export interface ConsoleExecutionRecord {
  seq: number;
  cue_no: string;
  cue_name: string;
  cue_scene_id: number | null;
  raw_time: string;
  elapsed_ms: number | null;
  channels: Record<string, number> | null;
  raw_line: string;
}

export interface ReconciliationEntry {
  id: number;
  track_id: number | null;
  cue_scene_id: number | null;
  cue_name: string;
  scheduled_ms: number | null;
  triggered_ms: number | null;
  delta_ms: number | null;
  layer: string;
  priority: number | null;
  status: ReconciliationStatus;
  reason: string;
  console_seq: number | null;
  channels: Record<string, number> | null;
}

export type ReconciliationEntryDraft = Omit<ReconciliationEntry, "id">;
