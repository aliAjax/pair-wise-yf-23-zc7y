import type { ConsoleExecutionRecord } from "../types/ConsoleExecutionRecord";
import { createDefaultConsoleExecutionRecord } from "../constructors/ConsoleExecutionRecordConstructor";

const STORAGE_KEY = "stage-light:console-execution-records";

function readStorage(): ConsoleExecutionRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConsoleExecutionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(records: ConsoleExecutionRecord[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 容量超限时保留内存态，提示分批核对
  }
}

export async function listConsoleExecutionRecord(): Promise<ConsoleExecutionRecord[]> {
  return readStorage().map((record) => createDefaultConsoleExecutionRecord(record));
}

export async function saveConsoleExecutionRecords(records: ConsoleExecutionRecord[]): Promise<number> {
  const existing = readStorage();
  const merged = [...existing];
  for (const record of records) {
    const index = merged.findIndex((item) => item.id === record.id);
    if (index >= 0) merged[index] = record;
    else merged.push(record);
  }
  writeStorage(merged);
  return merged.length;
}

export async function clearConsoleExecutionRecords(): Promise<void> {
  writeStorage([]);
}
