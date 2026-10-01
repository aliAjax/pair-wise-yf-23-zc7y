/// <reference lib="webworker" />
import type { ClockAlignment } from "../types/ReconciliationReport";
import type { PreparedConsoleRecord } from "../utils/reconciliationEngine";
import type { ScheduleItem } from "../utils/schedule";
import { reconcileBatch } from "../utils/reconciliationEngine";
import { RECONCILIATION_MAX_ATTEMPTS } from "../constants/reconciliationConfig";

export interface ReconcileBatchRequest {
  runId: number;
  batchIndex: number;
  attempt: number;
  items: ScheduleItem[];
  records: PreparedConsoleRecord[];
  alignment: ClockAlignment;
  /** 故障注入：该批次在 attempt <= failUntilAttempt 时抛错，用于演示“保留已完成部分再重试”。 */
  failUntilAttempt?: number;
}

export interface ReconcileBatchResponse {
  runId: number;
  batchIndex: number;
  attempt: number;
  ok: boolean;
  error?: string;
  entries?: ReturnType<typeof reconcileBatch>;
}

self.onmessage = (event: MessageEvent<ReconcileBatchRequest>) => {
  const { runId, batchIndex, attempt, items, records, alignment, failUntilAttempt } = event.data;
  try {
    if (typeof failUntilAttempt === "number" && attempt <= failUntilAttempt) {
      throw new Error(`批次 ${batchIndex + 1} 第 ${attempt} 次核对失败（控台连接中断）`);
    }
    if (attempt > RECONCILIATION_MAX_ATTEMPTS) {
      throw new Error(`批次 ${batchIndex + 1} 超过最大重试次数`);
    }
    const entries = reconcileBatch(items, records, alignment, batchIndex);
    const response: ReconcileBatchResponse = { runId, batchIndex, attempt, ok: true, entries };
    (self as unknown as Worker).postMessage(response);
  } catch (error) {
    const response: ReconcileBatchResponse = {
      runId,
      batchIndex,
      attempt,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
    (self as unknown as Worker).postMessage(response);
  }
};
