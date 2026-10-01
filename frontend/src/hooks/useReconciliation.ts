import { useCallback, useEffect, useMemo, useRef } from "react";
import { useReconciliationStore } from "../stores/ReconciliationStore";
import { useCueSceneStore } from "../stores/CueSceneStore";
import { useTimelineTrackStore } from "../stores/TimelineTrackStore";
import type { ConsoleExecutionRecord, ReconciliationEntry, ReconciliationEntryDraft } from "../types/ConsoleExecutionRecord";
import type { ClockAlignment } from "../types/ReconciliationReport";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { RECONCILIATION_BATCH_SIZE } from "../constants/reconciliationConfig";
import { createDefaultReconciliationReport } from "../constructors/ReconciliationReportConstructor";
import {
  alignRecords,
  assertLogNotEmpty,
  parseConsoleLog
} from "../utils/consoleLogParser";
import { resolveClockOffset } from "../utils/clockAlignment";
import {
  buildBatchPlan,
  groupRecordsByItemBatch,
  planBatches,
  prepareRecords,
  reconcileBatch
} from "../utils/reconciliationEngine";
import { buildSchedule, buildScheduleSignature } from "../utils/schedule";
import {
  loadConsoleLog,
  saveConsoleLog
} from "../api/ConsoleExecutionRecord";
import {
  listReconciliationReport,
  markReportStale,
  saveReconciliationReport
} from "../api/ReconciliationReport";
import type { ReconcileBatchRequest, ReconcileBatchResponse } from "../workers/reconciliationWorker";

function nextEntryId(seed: { current: number }) {
  seed.current += 1;
  return seed.current;
}

/** 把批次条目草稿补全局 id。 */
function hydrateEntries(drafts: ReconciliationEntryDraft[], seed: { current: number }): ReconciliationEntry[] {
  return drafts.map((draft) => ({ ...draft, id: nextEntryId(seed) }));
}

export function useReconciliation() {
  const tracks = useTimelineTrackStore((state) => state.rows);
  const scenes = useCueSceneStore((state) => state.rows);
  const loadTracks = useTimelineTrackStore((state) => state.load);
  const loadScenes = useCueSceneStore((state) => state.load);

  const {
    consoleLogText,
    records,
    parseErrors,
    running,
    report,
    lastError,
    setConsoleLogText,
    setParsed,
    startRun,
    patchBatch,
    replaceBatchEntries,
    finishRun,
    failRun,
    setReport,
    markStale
  } = useReconciliationStore();

  const idSeed = useRef(0);
  const runIdSeed = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const pendingResolve = useRef<((response: ReconcileBatchResponse) => void) | null>(null);

  const schedule = useMemo(() => buildSchedule(tracks, scenes), [tracks, scenes]);
  const signature = useMemo(() => buildScheduleSignature(tracks, scenes), [tracks, scenes]);

  useEffect(() => {
    void loadTracks();
    void loadScenes();
  }, [loadTracks, loadScenes]);

  // 回读上次粘贴的控台记录与报告。
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [text, persisted] = await Promise.all([loadConsoleLog(), listReconciliationReport()]);
      if (cancelled) return;
      if (text) {
        setConsoleLogText(text);
        const { records: parsed, errors } = parseConsoleLog(text);
        setParsed(parsed, errors);
      }
      if (persisted) setReport(persisted);
    })();
    return () => {
      cancelled = true;
    };
  }, [setConsoleLogText, setParsed, setReport]);

  // 编排改动：旧对账作废；仅标记，不自动重算。
  useEffect(() => {
    if (report && !report.stale && report.schedule_signature && report.schedule_signature !== signature) {
      markStale();
      void markReportStale(signature);
    }
  }, [report, signature, markStale]);

  const importLog = useCallback(
    async (text: string) => {
      setConsoleLogText(text);
      await saveConsoleLog(text);
      const { records: parsed, errors } = parseConsoleLog(text);
      setParsed(parsed, errors);
      assertLogNotEmpty(parsed);
      return { records: parsed, errors };
    },
    [setConsoleLogText, setParsed]
  );

  const runBatchOnce = useCallback(
    (request: ReconcileBatchRequest): Promise<ReconcileBatchResponse> =>
      new Promise((resolve) => {
        if (typeof Worker === "undefined") {
          // Worker 不可用时回退主线程逐批核对，保持“分批 + 可重试”语义不变。
          try {
            if (typeof request.failUntilAttempt === "number" && request.attempt <= request.failUntilAttempt) {
              throw new Error(`批次 ${request.batchIndex + 1} 第 ${request.attempt} 次核对失败（控台连接中断）`);
            }
            const entries = reconcileBatch(request.items, request.records, request.alignment, request.batchIndex);
            resolve({ runId: request.runId, batchIndex: request.batchIndex, attempt: request.attempt, ok: true, entries });
          } catch (error) {
            resolve({
              runId: request.runId,
              batchIndex: request.batchIndex,
              attempt: request.attempt,
              ok: false,
              error: error instanceof Error ? error.message : String(error)
            });
          }
          return;
        }
        if (!workerRef.current) {
          workerRef.current = new Worker(new URL("../workers/reconciliationWorker.ts", import.meta.url), { type: "module" });
          workerRef.current.onmessage = (event: MessageEvent<ReconcileBatchResponse>) => {
            pendingResolve.current?.(event.data);
            pendingResolve.current = null;
          };
          workerRef.current.onerror = () => {
            pendingResolve.current?.({
              runId: request.runId,
              batchIndex: request.batchIndex,
              attempt: request.attempt,
              ok: false,
              error: "worker 崩溃"
            });
            pendingResolve.current = null;
          };
        }
        pendingResolve.current = resolve;
        workerRef.current.postMessage(request);
      }),
    []
  );

  const executeBatches = useCallback(
    async (
      runId: number,
      alignment: ClockAlignment,
      alignedRecords: ConsoleExecutionRecord[],
      onlyBatchIndexes: number[] | null
    ) => {
      const current = useReconciliationStore.getState().running;
      if (!current || current.runId !== runId) return;

      const prepared = prepareRecords(alignedRecords, schedule);
      const batchCount = current.batchCount;
      const itemBuckets = buildBatchPlan(schedule, batchCount);
      const recordBuckets = groupRecordsByItemBatch(prepared, schedule, batchCount);
      const targets = onlyBatchIndexes ?? Array.from({ length: batchCount }, (_, index) => index);

      let failedMessage = "";

      for (const batchIndex of targets) {
        const live = useReconciliationStore.getState().running;
        const batchState = live?.batches[batchIndex];
        if (batchState?.status === "DONE" && onlyBatchIndexes === null) continue;
        const attempt = (batchState?.attempts ?? 0) + 1;
        patchBatch(runId, batchIndex, { status: "RUNNING", attempts: attempt, error: "" });
        // eslint-disable-next-line no-await-in-loop
        const inject =
          onlyBatchIndexes === null &&
          typeof live?.failBatchIndex === "number" &&
          live.failBatchIndex === batchIndex
            ? live.failUntilAttempt ?? undefined
            : undefined;
        const response = await runBatchOnce({
          runId,
          batchIndex,
          attempt,
          items: itemBuckets[batchIndex],
          records: recordBuckets[batchIndex],
          alignment,
          failUntilAttempt: inject
        });
        if (response.ok && response.entries) {
          const entries = hydrateEntries(response.entries, idSeed);
          replaceBatchEntries(runId, batchIndex, entries);
          patchBatch(runId, batchIndex, { status: "DONE", error: "" });
        } else {
          const message = ERROR_MESSAGES.RECONCILIATION_BATCH_FAILED.replace("{index}", String(batchIndex + 1));
          patchBatch(runId, batchIndex, {
            status: "FAILED",
            error: response.error ?? message
          });
          if (onlyBatchIndexes !== null) {
            // 单批重试失败立即返回，已完成的其它批次不受影响。
            failRun(runId, response.error ?? message);
            return false;
          }
          // 全量核对时继续处理后续批次，已完成部分全部保留。
          failedMessage = response.error ?? message;
        }
      }

      const state = useReconciliationStore.getState().running;
      if (!state || state.runId !== runId) return false;
      const failedBatches = state.batches.filter((batch) => batch.status !== "DONE");
      if (failedBatches.length > 0) {
        // 保留已完成部分，等待重试。
        const suffix = failedBatches.map((batch) => batch.index + 1).join("、");
        failRun(runId, failedMessage || `第 ${suffix} 批核对失败，可重试`);
        return false;
      }

      const allEntries = state.batches
        .flatMap((batch) => batch.entry_ids.map((id) => state.entriesById.get(id)))
        .filter((entry): entry is ReconciliationEntry => Boolean(entry))
        .sort(compareEntries);

      const finalReport = createDefaultReconciliationReport({
        id: Date.now(),
        created_at: new Date().toISOString(),
        alignment,
        schedule_signature: signature,
        batch_size: RECONCILIATION_BATCH_SIZE,
        clock_offset_ms: state.clockOffsetMs,
        entries: allEntries,
        batches: state.batches.map((batch) => ({ ...batch })),
        stale: false
      });
      finishRun(runId, finalReport);
      await saveReconciliationReport(finalReport);
      return true;
    },
    [schedule, signature, runBatchOnce, patchBatch, replaceBatchEntries, finishRun, failRun]
  );

  const startReconciliation = useCallback(
    async (alignmentInput: ClockAlignment, options: { failUntilAttempt?: number } = {}) => {
      const alignment: ClockAlignment = {
        ...alignmentInput,
        tolerance_ms: Number(alignmentInput.tolerance_ms) || 0
      };
      if (!records.length) {
        throw Object.assign(new Error(ERROR_MESSAGES.CONSOLE_LOG_EMPTY), { code: ERROR_CODES.CONSOLE_LOG_EMPTY });
      }
      let clockOffsetMs = 0;
      try {
        clockOffsetMs = resolveClockOffset(alignment.show_started_at, alignment.console_clock_at_show_start || alignment.show_started_at);
      } catch {
        throw Object.assign(new Error(ERROR_MESSAGES.CLOCK_ALIGNMENT_INVALID), { code: ERROR_CODES.CLOCK_ALIGNMENT_INVALID });
      }
      const aligned = alignRecords(records, alignment.show_started_at, clockOffsetMs);
      const batchCount = planBatches(schedule.length, aligned.length, RECONCILIATION_BATCH_SIZE);
      runIdSeed.current += 1;
      const runId = runIdSeed.current;
      idSeed.current = 0;
      startRun({
        runId,
        alignment,
        clockOffsetMs,
        batchCount,
        failBatchIndex: typeof options.failUntilAttempt === "number" ? 0 : null,
        failUntilAttempt: options.failUntilAttempt ?? null
      });
      console.info(LOG_TEMPLATES.Reconciliation[1], { batchCount, records: aligned.length });
      void executeBatches(runId, alignment, aligned, null);
      return runId;
    },
    [records, schedule.length, startRun, executeBatches]
  );

  const retryFailedBatches = useCallback(async () => {
    const current = useReconciliationStore.getState().running;
    const activeReport = current ?? null;
    if (!activeReport || !activeReport.alignment) return false;
    const failedIndexes = activeReport.batches.filter((batch) => batch.status === "FAILED").map((batch) => batch.index);
    if (failedIndexes.length === 0) return false;
    console.info(LOG_TEMPLATES.Reconciliation[2], { failedIndexes: failedIndexes.map((i) => i + 1) });
    // 重试沿用原始对齐参数与控台记录（重新解析当前文本）。
    const aligned = alignRecords(records, activeReport.alignment.show_started_at, activeReport.clockOffsetMs);
    return executeBatches(activeReport.runId, activeReport.alignment, aligned, failedIndexes);
  }, [records, executeBatches]);

  return {
    consoleLogText,
    records,
    parseErrors,
    running,
    report,
    lastError,
    schedule,
    signature,
    importLog,
    startReconciliation,
    retryFailedBatches
  };
}

function compareEntries(a: ReconciliationEntry, b: ReconciliationEntry): number {
  const at = a.scheduled_ms ?? Number.POSITIVE_INFINITY;
  const bt = b.scheduled_ms ?? Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;
  if (a.status !== b.status) return a.status.localeCompare(b.status);
  return a.id - b.id;
}
