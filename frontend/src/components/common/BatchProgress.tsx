import type { ReconciliationRecord } from "../../types/ReconciliationRecord";
import { formatNumber } from "../../utils/formatters";

interface Props {
  record: ReconciliationRecord | null;
  phase: string;
  error: string;
  onRetry: () => void;
}

export function BatchProgress({ record, phase, error, onRetry }: Props) {
  if (!record) return null;
  const percent = record.total_count > 0 ? Math.round((record.processed_count / record.total_count) * 100) : 0;
  const failed = phase === "partial" || phase === "failed";
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>③ 分批核对进度</h2>
        <span className="hint">
          第 {Math.min(record.current_batch + (phase === "running" ? 1 : 0), record.total_batches)} / {record.total_batches} 批
          （每批 {formatNumber(record.capacity)} 条）
        </span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${failed ? "failed" : ""}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meta">
        <span>已处理 {formatNumber(record.processed_count)} / {formatNumber(record.total_count)} 条</span>
        {failed && (
          <button className="primary" onClick={onRetry}>断点重试</button>
        )}
      </div>
      {failed && (
        <p className="error-text">
          批次执行失败（{error}），已保留第 {record.current_batch} 批之前的完成结果，可从断点继续。
        </p>
      )}
    </section>
  );
}
