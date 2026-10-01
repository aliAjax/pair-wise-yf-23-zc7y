import type { BatchStatus } from "./BatchStatus";
import type { ReconciliationEntry } from "./ConsoleExecutionRecord";

/**
 * 控台时钟与本地演出开始时间的对齐参数。
 * show_started_at：演出实际开始（本地时钟，ISO 字符串或 HH:MM:SS）。
 * console_clock_at_show_start：同一时刻控台时钟读数；不传则视为两钟一致。
 */
export interface ClockAlignment {
  show_started_at: string;
  console_clock_at_show_start: string;
  tolerance_ms: number;
}

export interface ReconciliationBatch {
  index: number;
  status: BatchStatus;
  attempts: number;
  error: string;
  entry_ids: number[];
}

/**
 * 对账报告。schedule_signature 是本地编排快照摘要；
 * 编排改动后签名不匹配，旧报告作废（stale），需重新对账。
 */
export interface ReconciliationReport {
  id: number;
  created_at: string;
  alignment: ClockAlignment;
  schedule_signature: string;
  batch_size: number;
  clock_offset_ms: number;
  entries: ReconciliationEntry[];
  batches: ReconciliationBatch[];
  stale: boolean;
}
