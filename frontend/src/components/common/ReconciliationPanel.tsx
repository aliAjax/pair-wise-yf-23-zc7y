import { useMemo } from "react";
import { useReconciliation } from "../../hooks/useReconciliation";
import { ConsoleRecordPaste } from "./ConsoleRecordPaste";
import { ClockAlignmentForm } from "./ClockAlignmentForm";
import { ReconciliationSummary } from "./ReconciliationSummary";
import { BatchProgress } from "./BatchProgress";
import { StaleBanner } from "./StaleBanner";
import { ReconciliationResultTable } from "./ReconciliationResultTable";
import { sampleConsoleRecords, sampleShowStartConsoleMs } from "../../mocks/consoleRecordSample";
import { RECONCILIATION_CONFIG } from "../../config";

export function ReconciliationPanel() {
  const {
    tracks,
    consoleRecords,
    fallbackCount,
    reconciliation,
    results,
    phase,
    error,
    showStartConsoleMs,
    setShowStartConsoleMs,
    importRecords,
    start,
    retry
  } = useReconciliation();

  const running = phase === "running";
  const stale = phase === "stale";

  const batchPlan = useMemo(() => {
    const total = consoleRecords.length;
    const batches = Math.max(1, Math.ceil(total / RECONCILIATION_CONFIG.batchCapacity));
    return { total, batches, capacity: RECONCILIATION_CONFIG.batchCapacity };
  }, [consoleRecords.length]);

  const handleLoadSample = async () => {
    setShowStartConsoleMs(sampleShowStartConsoleMs);
    await importRecords(JSON.stringify(sampleConsoleRecords));
  };

  return (
    <div className="reconciliation-desk">
      <StaleBanner visible={stale} onRecalculate={start} />

      <div className="workbench">
        <ConsoleRecordPaste
          onImport={importRecords}
          onLoadSample={handleLoadSample}
          recordCount={consoleRecords.length}
          fallbackCount={fallbackCount}
        />
        <ClockAlignmentForm
          value={showStartConsoleMs}
          onChange={setShowStartConsoleMs}
          recordCount={consoleRecords.length}
          disabled={running}
        />
      </div>

      <section className="panel reconcile-action">
        <div className="panel-head">
          <h2>④ 开始执行对账</h2>
          <span className="hint">
            本地编排 {tracks.length} 条轨道，控台记录 {batchPlan.total} 条，
            按每批 {batchPlan.capacity} 条核对，共 {batchPlan.batches} 批。
          </span>
        </div>
        <div className="paste-actions">
          <button
            className="primary"
            disabled={running || consoleRecords.length === 0}
            onClick={start}
          >
            {running ? "对账进行中…" : "开始对账"}
          </button>
          {phase === "partial" && (
            <button className="primary" onClick={retry}>断点重试</button>
          )}
          {consoleRecords.length === 0 && (
            <span className="hint">请先粘贴或载入控台执行记录</span>
          )}
        </div>
      </section>

      <BatchProgress
        record={stale ? null : reconciliation}
        phase={phase}
        error={error}
        onRetry={retry}
      />

      {!stale && <ReconciliationSummary record={reconciliation} />}

      <ReconciliationResultTable results={stale ? [] : results} />
    </div>
  );
}
