import type { ReconciliationRecord } from "../types/ReconciliationRecord";
import type { ReconciliationResultItem } from "../types/ReconciliationResultItem";
import { createDefaultReconciliationRecord } from "../constructors/ReconciliationRecordConstructor";
import { createDefaultReconciliationResultItem } from "../constructors/ReconciliationResultItemConstructor";

const RECORD_KEY = "stage-light:reconciliation-record";
const RESULT_KEY = "stage-light:reconciliation-results";

function readRecord(): ReconciliationRecord | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(RECORD_KEY);
    if (!raw) return null;
    return createDefaultReconciliationRecord(JSON.parse(raw) as Partial<ReconciliationRecord>);
  } catch {
    return null;
  }
}

function writeRecord(record: ReconciliationRecord): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // 持久化失败时保留内存态
  }
}

function readResults(): ReconciliationResultItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReconciliationResultItem[];
    return Array.isArray(parsed) ? parsed.map((item) => createDefaultReconciliationResultItem(item)) : [];
  } catch {
    return [];
  }
}

function writeResults(results: ReconciliationResultItem[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RESULT_KEY, JSON.stringify(results));
  } catch {
    // 容量超限时保留已完成批次，等待重试
  }
}

export async function getLatestReconciliationRecord(): Promise<ReconciliationRecord | null> {
  return readRecord();
}

export async function saveReconciliationRecord(record: ReconciliationRecord): Promise<ReconciliationRecord> {
  writeRecord(record);
  return record;
}

export async function listReconciliationResults(reconciliationId: number): Promise<ReconciliationResultItem[]> {
  return readResults().filter((item) => item.reconciliation_id === reconciliationId);
}

export async function saveReconciliationResults(results: ReconciliationResultItem[]): Promise<void> {
  const existing = readResults();
  const ids = new Set(results.map((item) => item.id));
  writeResults([...existing.filter((item) => !ids.has(item.id)), ...results]);
}

export async function appendReconciliationResults(results: ReconciliationResultItem[]): Promise<void> {
  const existing = readResults();
  const known = new Set(existing.map((item) => `${item.reconciliation_id}:${item.batch_index}:${item.timeline_track_id}`));
  const fresh = results.filter((item) => !known.has(`${item.reconciliation_id}:${item.batch_index}:${item.timeline_track_id}`));
  writeResults([...existing, ...fresh]);
}
