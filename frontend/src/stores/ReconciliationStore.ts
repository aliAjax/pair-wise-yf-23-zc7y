import { create } from "zustand";
import type { ConsoleExecutionRecord, ReconciliationEntry } from "../types/ConsoleExecutionRecord";
import type { ClockAlignment, ReconciliationBatch, ReconciliationReport } from "../types/ReconciliationReport";
import type { BatchStatus } from "../types/BatchStatus";

type RunningState = {
  runId: number;
  alignment: ClockAlignment | null;
  clockOffsetMs: number;
  batchCount: number;
  /** 故障注入目标批次（仅首批执行时失败，重试放行）。 */
  failBatchIndex: number | null;
  failUntilAttempt: number | null;
  batches: ReconciliationBatch[];
  /** 已完成批次产出的条目（按 entry id 存放）；失败重试时只替换对应批次。 */
  entriesById: Map<number, ReconciliationEntry>;
};

type State = {
  consoleLogText: string;
  records: ConsoleExecutionRecord[];
  parseErrors: { line: number; text: string }[];
  running: RunningState | null;
  report: ReconciliationReport | null;
  lastError: string;
  setConsoleLogText: (text: string) => void;
  setParsed: (records: ConsoleExecutionRecord[], errors: { line: number; text: string }[]) => void;
  startRun: (params: {
    runId: number;
    alignment: ClockAlignment;
    clockOffsetMs: number;
    batchCount: number;
    failBatchIndex?: number | null;
    failUntilAttempt?: number | null;
  }) => void;
  patchBatch: (runId: number, batchIndex: number, patch: Partial<ReconciliationBatch> & { status?: BatchStatus }) => void;
  replaceBatchEntries: (runId: number, batchIndex: number, entries: ReconciliationEntry[]) => void;
  finishRun: (runId: number, report: ReconciliationReport) => void;
  failRun: (runId: number, message: string) => void;
  setReport: (report: ReconciliationReport | null) => void;
  markStale: () => void;
  reset: () => void;
};

export const useReconciliationStore = create<State>((set, get) => ({
  consoleLogText: "",
  records: [],
  parseErrors: [],
  running: null,
  report: null,
  lastError: "",

  setConsoleLogText: (text) => set({ consoleLogText: text }),

  setParsed: (records, parseErrors) => set({ records, parseErrors }),

  startRun: ({ runId, alignment, clockOffsetMs, batchCount, failBatchIndex, failUntilAttempt }) =>
    set({
      lastError: "",
      running: {
        runId,
        alignment,
        clockOffsetMs,
        batchCount,
        failBatchIndex: failBatchIndex ?? null,
        failUntilAttempt: failUntilAttempt ?? null,
        batches: Array.from({ length: batchCount }, (_, index) => ({
          index,
          status: "PENDING" as BatchStatus,
          attempts: 0,
          error: "",
          entry_ids: []
        })),
        entriesById: new Map<number, ReconciliationEntry>()
      }
    }),

  patchBatch: (runId, batchIndex, patch) => {
    const running = get().running;
    if (!running || running.runId !== runId) return;
    const batches = running.batches.map((batch) =>
      batch.index === batchIndex ? { ...batch, ...patch } : batch
    );
    set({ running: { ...running, batches } });
  },

  replaceBatchEntries: (runId, batchIndex, entries) => {
    const running = get().running;
    if (!running || running.runId !== runId) return;
    const oldIds = running.batches.find((batch) => batch.index === batchIndex)?.entry_ids ?? [];
    const entriesById = new Map(running.entriesById);
    for (const id of oldIds) entriesById.delete(id);
    const entryIds: number[] = [];
    for (const entry of entries) {
      entriesById.set(entry.id, entry);
      entryIds.push(entry.id);
    }
    const batches = running.batches.map((batch) =>
      batch.index === batchIndex ? { ...batch, entry_ids: entryIds } : batch
    );
    set({ running: { ...running, entriesById, batches } });
  },

  finishRun: (runId, report) => {
    const running = get().running;
    if (!running || running.runId !== runId) return;
    set({ running: null, report, lastError: "" });
  },

  failRun: (runId, message) => {
    const running = get().running;
    if (!running || running.runId !== runId) return;
    // 关键：失败后保留已完成批次，running 不被清空，供“重试失败批次”继续。
    set({ lastError: message });
  },

  setReport: (report) => set({ report, running: report ? get().running : null }),

  markStale: () => {
    const report = get().report;
    if (report && !report.stale) set({ report: { ...report, stale: true }, lastError: "" });
  },

  reset: () => set({ running: null, lastError: "" })
}));
