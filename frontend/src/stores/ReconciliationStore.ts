import { create } from "zustand";
import type { TimelineTrack } from "../types/TimelineTrack";
import type { CueScene } from "../types/CueScene";
import type { ConsoleExecutionRecord } from "../types/ConsoleExecutionRecord";
import type { ReconciliationRecord } from "../types/ReconciliationRecord";
import type { ReconciliationResultItem } from "../types/ReconciliationResultItem";
import { createDefaultReconciliationRecord } from "../constructors/ReconciliationRecordConstructor";
import {
  getLatestReconciliationRecord,
  saveReconciliationRecord,
  listReconciliationResults,
  appendReconciliationResults
} from "../api/ReconciliationRecord";
import { computeOrchestrationFingerprint } from "../utils/reconciliationEngine";
import { RECONCILIATION_CONFIG } from "../config";
import type { WorkerBatchResponse } from "../workers/reconciliationWorker";

type Phase = "idle" | "running" | "partial" | "completed" | "failed" | "stale";

type State = {
  tracks: TimelineTrack[];
  scenes: CueScene[];
  current: ReconciliationRecord | null;
  results: ReconciliationResultItem[];
  phase: Phase;
  error: string;
  fingerprint: string;
  loadOrchestration: (tracks: TimelineTrack[], scenes: CueScene[]) => Promise<void>;
  start: (records: ConsoleExecutionRecord[], showStartConsoleMs: number) => Promise<void>;
  retry: (records: ConsoleExecutionRecord[], showStartConsoleMs: number) => Promise<void>;
  reset: () => void;
};

let worker: Worker | null = null;

function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

function createWorker(): Worker {
  return new Worker(new URL("../workers/reconciliationWorker.ts", import.meta.url), { type: "module" });
}

function summarize(results: ReconciliationResultItem[]) {
  return {
    matched_count: results.filter((item) => item.status === "MATCHED").length,
    missed_count: results.filter((item) => item.status === "MISSED").length,
    overtime_count: results.filter((item) => item.status === "OVERTIME").length,
    overridden_count: results.filter((item) => item.status === "OVERRIDDEN").length,
    extra_count: results.filter((item) => item.status === "EXTRA").length
  };
}

const PHASE_MAP: Record<string, Phase> = {
  COMPLETED: "completed",
  PARTIAL: "partial",
  FAILED: "failed"
};

export const useReconciliationStore = create<State>((set, get) => ({
  tracks: [],
  scenes: [],
  current: null,
  results: [],
  phase: "idle",
  error: "",
  fingerprint: "",

  async loadOrchestration(tracks, scenes) {
    const fingerprint = computeOrchestrationFingerprint({ tracks, scenes });
    const latest = await getLatestReconciliationRecord();
    if (!latest) {
      set({ tracks, scenes, current: null, results: [], phase: "idle", fingerprint });
      return;
    }
    if (latest.orchestration_fingerprint !== fingerprint) {
      set({ tracks, scenes, current: { ...latest, status: "STALE" }, results: [], phase: "stale", fingerprint });
      return;
    }
    const results = await listReconciliationResults(latest.id);
    set({ tracks, scenes, current: latest, results, phase: PHASE_MAP[latest.status] ?? "idle", fingerprint });
  },

  async start(records, showStartConsoleMs) {
    const { tracks, scenes, fingerprint } = get();
    const capacity = RECONCILIATION_CONFIG.batchCapacity;
    const totalBatches = Math.max(1, Math.ceil(records.length / capacity));
    const record = createDefaultReconciliationRecord({
      id: Date.now(),
      show_project_id: 0,
      orchestration_fingerprint: fingerprint,
      status: "RUNNING",
      total_count: records.length,
      capacity,
      total_batches: totalBatches,
      started_at: new Date().toISOString()
    });
    await saveReconciliationRecord(record);
    set({ current: record, results: [], phase: "running", error: "" });
    await runBatches({ tracks, scenes, records, showStartConsoleMs, startBatch: 0 });
  },

  async retry(records, showStartConsoleMs) {
    const { tracks, scenes, current } = get();
    if (!current) return;
    set({ phase: "running", error: "" });
    await runBatches({ tracks, scenes, records, showStartConsoleMs, startBatch: current.current_batch });
  },

  reset() {
    terminateWorker();
    set({ current: null, results: [], phase: "idle", error: "" });
  }
}));

interface RunBatchesArgs {
  tracks: TimelineTrack[];
  scenes: CueScene[];
  records: ConsoleExecutionRecord[];
  showStartConsoleMs: number;
  startBatch: number;
}

async function runBatches({ tracks, scenes, records, showStartConsoleMs, startBatch }: RunBatchesArgs) {
  const { current, results: priorResults } = useReconciliationStore.getState();
  if (!current) return;

  const capacity = current.capacity;
  const totalBatches = current.total_batches;
  const completedResults = priorResults.filter((item) => item.reconciliation_id === current.id);
  const newResults: ReconciliationResultItem[] = [];
  let failed = false;
  let errorMessage = "";

  for (let batchIndex = startBatch; batchIndex < totalBatches; batchIndex += 1) {
    const batchRecords = records.slice(batchIndex * capacity, (batchIndex + 1) * capacity);
    try {
      const batchResults = await runBatchInWorker({
        reconciliationId: current.id,
        batchIndex,
        tracks,
        scenes,
        records: batchRecords,
        showStartConsoleMs,
        overtimeToleranceMs: RECONCILIATION_CONFIG.overtimeToleranceMs,
        failAtBatch: RECONCILIATION_CONFIG.failAtBatch
      });
      newResults.push(...batchResults);
      const merged = [...completedResults, ...newResults];
      const updated: ReconciliationRecord = {
        ...current,
        ...summarize(merged),
        processed_count: merged.length,
        current_batch: batchIndex + 1,
        status: "RUNNING"
      };
      await appendReconciliationResults(batchResults);
      await saveReconciliationRecord(updated);
      useReconciliationStore.setState({ current: updated, results: merged, phase: "running" });
    } catch (error) {
      failed = true;
      errorMessage = error instanceof Error ? error.message : "RECONCILIATION_BATCH_FAILED";
      const merged = [...completedResults, ...newResults];
      const updated: ReconciliationRecord = {
        ...current,
        ...summarize(merged),
        processed_count: merged.length,
        current_batch: batchIndex,
        status: "PARTIAL",
        error: errorMessage
      };
      await saveReconciliationRecord(updated);
      useReconciliationStore.setState({ current: updated, results: merged, phase: "partial", error: errorMessage });
      break;
    }
  }

  if (!failed) {
    const merged = [...completedResults, ...newResults];
    const updated: ReconciliationRecord = {
      ...current,
      ...summarize(merged),
      processed_count: merged.length,
      current_batch: totalBatches,
      status: "COMPLETED",
      completed_at: new Date().toISOString()
    };
    await saveReconciliationRecord(updated);
    useReconciliationStore.setState({ current: updated, results: merged, phase: "completed" });
  }
  terminateWorker();
}

interface RunBatchArgs {
  reconciliationId: number;
  batchIndex: number;
  tracks: TimelineTrack[];
  scenes: CueScene[];
  records: ConsoleExecutionRecord[];
  showStartConsoleMs: number;
  overtimeToleranceMs: number;
  failAtBatch: number;
}

function runBatchInWorker(args: RunBatchArgs): Promise<ReconciliationResultItem[]> {
  return new Promise((resolve, reject) => {
    terminateWorker();
    const activeWorker = createWorker();
    worker = activeWorker;
    activeWorker.onmessage = (event: MessageEvent<WorkerBatchResponse>) => {
      const message = event.data;
      if (message.type === "BATCH_DONE" && message.payload.results) {
        resolve(message.payload.results);
      } else if (message.type === "BATCH_ERROR") {
        reject(new Error(message.payload.error ?? "RECONCILIATION_BATCH_FAILED"));
      } else {
        reject(new Error("RECONCILIATION_BATCH_FAILED"));
      }
    };
    activeWorker.onerror = (event) => reject(new Error(event.message || "RECONCILIATION_BATCH_FAILED"));
    activeWorker.postMessage({
      type: "BATCH",
      payload: {
        reconciliationId: args.reconciliationId,
        batchIndex: args.batchIndex,
        tracks: args.tracks,
        records: args.records,
        showStartConsoleMs: args.showStartConsoleMs,
        overtimeToleranceMs: args.overtimeToleranceMs,
        failAtBatch: args.failAtBatch
      }
    });
  });
}
