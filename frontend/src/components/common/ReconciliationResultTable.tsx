import { useMemo, useState } from "react";
import type { ReconciliationEntry } from "../../types/ConsoleExecutionRecord";
import type { ReconciliationStatus } from "../../types/ReconciliationStatus";
import { RECONCILIATION_STATUS_TEXT } from "../../constants/ReconciliationStatus";
import { StatusBadge } from "./StatusBadge";
import { formatElapsedMs, formatMsDelta } from "../../utils/formatters";

const FILTERS: Array<"ALL" | ReconciliationStatus> = [
  "ALL",
  "NOT_EXECUTED",
  "TIMEOUT",
  "OVERRIDDEN",
  "ORPHAN",
  "MATCHED"
];

interface Props {
  entries: ReconciliationEntry[];
  pageSize?: number;
}

export function ReconciliationResultTable({ entries, pageSize = 8 }: Props) {
  const [filter, setFilter] = useState<"ALL" | ReconciliationStatus>("ALL");
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () => (filter === "ALL" ? entries : entries.filter((entry) => entry.status === filter)),
    [entries, filter]
  );
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  const changeFilter = (next: "ALL" | ReconciliationStatus) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <div className="recon-table-wrap">
      <div className="recon-filters">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "chip active" : "chip"}
            onClick={() => changeFilter(value)}
          >
            {value === "ALL" ? "全部" : RECONCILIATION_STATUS_TEXT[value]}
          </button>
        ))}
      </div>
      <div className="table recon-table">
        <div className="recon-row recon-row-head">
          <span>状态</span><span>场景</span><span>编排时刻</span><span>实际触发</span><span>偏差</span><span>说明</span>
        </div>
        {pageRows.length === 0 && <p className="recon-empty">该分类下暂无条目</p>}
        {pageRows.map((entry) => (
          <div className="recon-row" key={entry.id}>
            <span><StatusBadge value={entry.status} /></span>
            <span>
              <strong>{entry.cue_name}</strong>
              <small>{entry.layer ? `轨道 #${entry.track_id} · ${entry.layer}` : `控台序号 ${entry.console_seq ?? "—"}`}</small>
            </span>
            <span>{formatElapsedMs(entry.scheduled_ms)}</span>
            <span>{formatElapsedMs(entry.triggered_ms)}</span>
            <span className={`delta ${entry.delta_ms !== null && Math.abs(entry.delta_ms) > 0 ? (isTimeout(entry) ? "bad" : "ok") : ""}`}>
              {formatMsDelta(entry.delta_ms)}
            </span>
            <span className="recon-reason">{entry.reason}</span>
          </div>
        ))}
      </div>
      <div className="recon-pager">
        <button type="button" className="chip" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</button>
        <span>{page} / {pageCount}（共 {rows.length} 条）</span>
        <button type="button" className="chip" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>下一页</button>
      </div>
    </div>
  );
}

function isTimeout(entry: ReconciliationEntry): boolean {
  return entry.status === "TIMEOUT";
}
