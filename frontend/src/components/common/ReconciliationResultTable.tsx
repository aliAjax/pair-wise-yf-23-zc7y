import { useMemo, useState } from "react";
import type { ReconciliationResultItem } from "../../types/ReconciliationResultItem";
import { ReconciliationItemStatusText } from "../../constants/ReconciliationItemStatus";
import { formatMs } from "../../utils/formatters";

interface Props {
  results: ReconciliationResultItem[];
}

const FILTERS = ["ALL", "MISSED", "OVERTIME", "OVERRIDDEN", "MATCHED", "EXTRA"] as const;

export function ReconciliationResultTable({ results }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    if (filter === "ALL") return results;
    return results.filter((item) => item.status === filter);
  }, [results, filter]);

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  if (results.length === 0) {
    return <section className="panel"><h2>对账结果</h2><p className="hint">暂无对账结果。</p></section>;
  }

  return (
    <section className="panel wide">
      <div className="panel-head">
        <h2>对账结果</h2>
        <div className="filters">
          {FILTERS.map((item) => (
            <button
              key={item}
              className={filter === item ? "chip active" : "chip"}
              onClick={() => { setFilter(item); setPage(1); }}
            >
              {item === "ALL" ? "全部" : ReconciliationItemStatusText[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="table">
        {pageRows.map((row) => (
          <article key={`${row.reconciliation_id}-${row.batch_index}-${row.timeline_track_id}-${row.cue_scene_id}`} className={`row result-row status-${row.status.toLowerCase()}`}>
            <strong>场景 #{row.cue_scene_id}</strong>
            <span>计划 {formatMs(row.planned_start_ms)}</span>
            <span>实际 {row.actual_trigger_ms < 0 ? "未触发" : formatMs(row.actual_trigger_ms)}</span>
            <span>偏移 {formatMs(row.delay_ms)}</span>
            <StatusBadge value={row.status} />
            <span className="detail">{row.detail}</span>
          </article>
        ))}
      </div>
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
        <span>{page} / {totalPages} 页</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
      </div>
    </section>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`badge status-${value.toLowerCase()}`}>{ReconciliationItemStatusText[value as keyof typeof ReconciliationItemStatusText] ?? value}</span>;
}
