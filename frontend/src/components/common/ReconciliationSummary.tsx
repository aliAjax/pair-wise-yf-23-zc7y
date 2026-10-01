import type { ReconciliationRecord } from "../../types/ReconciliationRecord";
import { formatPercent } from "../../utils/formatters";

interface Props {
  record: ReconciliationRecord | null;
}

export function ReconciliationSummary({ record }: Props) {
  if (!record) return null;
  const items = [
    { label: "应执行", value: record.total_count, tone: "neutral" },
    { label: "准时", value: record.matched_count, tone: "ok" },
    { label: "超时", value: record.overtime_count, tone: "warn" },
    { label: "未执行", value: record.missed_count, tone: "bad" },
    { label: "被覆盖", value: record.overridden_count, tone: "warn" },
    { label: "多余触发", value: record.extra_count, tone: "neutral" }
  ];
  return (
    <section className="metrics">
      {items.map((item) => (
        <div key={item.label} className={`stat tone-${item.tone}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <em>{formatPercent(item.value, record.total_count)}</em>
        </div>
      ))}
    </section>
  );
}
