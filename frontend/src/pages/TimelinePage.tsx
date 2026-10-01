import { useMemo, useState } from "react";
import { useReconciliation } from "../hooks/useReconciliation";
import type { ClockAlignment } from "../types/ReconciliationReport";
import { StatusBadge } from "../components/common/StatusBadge";
import { StatCard } from "../components/common/StatCard";
import { TimelineRuler } from "../components/common/TimelineRuler";
import { ConsoleLogImporter } from "../components/common/ConsoleLogImporter";
import { ClockAlignmentForm } from "../components/common/ClockAlignmentForm";
import { ReconciliationResultTable } from "../components/common/ReconciliationResultTable";
import { ReconciliationProgress } from "../components/common/ReconciliationProgress";
import { RECONCILIATION_STATUS_TEXT } from "../constants/ReconciliationStatus";

export function TimelinePage() {
  const {
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
  } = useReconciliation();
  const [formError, setFormError] = useState("");

  const entries = running
    ? Array.from(running.entriesById.values())
    : report?.entries ?? [];

  const stats = useMemo(() => {
    const base: Record<string, number> = { NOT_EXECUTED: 0, TIMEOUT: 0, OVERRIDDEN: 0, ORPHAN: 0, MATCHED: 0 };
    for (const entry of entries) base[entry.status] += 1;
    return base;
  }, [entries]);

  const handleStart = async (alignment: ClockAlignment, options: { failUntilAttempt?: number }) => {
    setFormError("");
    try {
      await startReconciliation(alignment, options);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };

  const stale = report?.stale === true;
  const runningBatches = running?.batches ?? null;
  const hasFailedBatch = runningBatches?.some((batch) => batch.status === "FAILED") ?? false;

  return (
    <section className="recon-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">stage-light · execution reconciliation</p>
          <h1>执行对账台</h1>
          <p className="recon-subtitle">
            粘贴灯控台导出的执行记录，按演出开始时间对齐控台时钟，逐条比对本地编排场景与实际触发时刻。
          </p>
        </div>
        <StatusBadge value={running ? "RUNNING" : stale ? "REPORT_STALE" : records.length ? "READY" : "LOCAL_DATA"} />
      </header>

      <section className="metrics">
        <StatCard label="编排场景" value={schedule.length} />
        <StatCard label="控台记录" value={records.length} />
        <StatCard label={RECONCILIATION_STATUS_TEXT.NOT_EXECUTED} value={stats.NOT_EXECUTED} />
        <StatCard label={RECONCILIATION_STATUS_TEXT.TIMEOUT} value={stats.TIMEOUT} />
        <StatCard label={RECONCILIATION_STATUS_TEXT.OVERRIDDEN} value={stats.OVERRIDDEN} />
        <StatCard label={RECONCILIATION_STATUS_TEXT.ORPHAN} value={stats.ORPHAN} />
      </section>

      {stale && (
        <div className="panel recon-stale-banner">
          <strong>旧对账已作废</strong>
          <span>编排自上次对账后发生改动（当前指纹 {signature.slice(0, 12)}…），请重新对账。</span>
        </div>
      )}

      <section className="workbench recon-workbench">
        <div className="panel wide">
          <h2>控台执行记录</h2>
          <ConsoleLogImporter value={consoleLogText} recordCount={records.length} parseErrors={parseErrors} onImport={importLog} />
          <TimelineRuler title="编排时间轴" value={records.length ? "READY" : "DRAFT"} />
        </div>

        <div className="panel">
          <h2>时钟对齐</h2>
          <ClockAlignmentForm onSubmit={handleStart} disabled={running !== null} />
          {formError && <p className="recon-error">{formError}</p>}
          {report && !running && (
            <p className="recon-meta">
              上次对账：{new Date(report.created_at).toLocaleString("zh-CN")} · 时钟偏移 {report.clock_offset_ms}ms ·{" "}
              分 {report.batches.length} 批
            </p>
          )}
        </div>
      </section>

      {runningBatches && (
        <section className="panel">
          <h2>分批核对</h2>
          <ReconciliationProgress batches={runningBatches} />
          {hasFailedBatch && (
            <div className="recon-retry-bar">
              <button type="button" className="btn-primary" onClick={() => void retryFailedBatches()}>
                重试失败批次
              </button>
              <span>已完成批次的结果会保留，仅重新核对失败批次。</span>
            </div>
          )}
        </section>
      )}

      {lastError && <p className="recon-error">{lastError}</p>}

      <section className="panel wide">
        <h2>对账明细{entries.length > 0 ? `（${entries.length} 条）` : ""}</h2>
        {entries.length === 0 ? (
          <div className="empty">导入控台记录并完成对账后，这里列出未执行、超时、被覆盖和无编排的条目。</div>
        ) : (
          <ReconciliationResultTable entries={entries} />
        )}
      </section>
    </section>
  );
}
