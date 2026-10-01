import { ReconciliationPanel } from "../components/common/ReconciliationPanel";
import { StatusBadge } from "../components/common/StatusBadge";

export function TimelinePage() {
  return (
    <main className="page">
      <section className="page-head">
        <div>
          <p className="eyebrow">stage-light · 执行对账台</p>
          <h1>时间轴编排 · 执行对账</h1>
        </div>
        <StatusBadge value="RECONCILIATION" />
      </section>
      <p className="page-sub">
        演出结束后，把灯控台导出的执行记录贴进来，按演出开始时间对齐控台时钟，
        逐条比对本地编排场景与控台实际触发时刻，列出未执行、超时和被覆盖的条目。
      </p>
      <ReconciliationPanel />
    </main>
  );
}
