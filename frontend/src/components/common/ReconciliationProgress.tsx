import type { ReconciliationBatch } from "../../types/ReconciliationReport";
import { BATCH_STATUS_TEXT } from "../../constants/BatchStatus";
import { StatusBadge } from "./StatusBadge";

interface Props {
  batches: ReconciliationBatch[];
}

export function ReconciliationProgress({ batches }: Props) {
  const done = batches.filter((batch) => batch.status === "DONE").length;
  const failed = batches.filter((batch) => batch.status === "FAILED").length;
  return (
    <div className="recon-progress">
      <p className="recon-progress-head">
        分批核对进度：{done}/{batches.length} 批完成{failed > 0 ? `，${failed} 批失败（结果已保留，可重试）` : ""}
      </p>
      <ol className="recon-batch-list">
        {batches.map((batch) => (
          <li key={batch.index}>
            <StatusBadge value={batch.status} />
            <span>第 {batch.index + 1} 批 · {BATCH_STATUS_TEXT[batch.status]} · 尝试 {batch.attempts} 次</span>
            {batch.error && <em className="recon-batch-error">{batch.error}</em>}
          </li>
        ))}
      </ol>
    </div>
  );
}
