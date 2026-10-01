export const ReconciliationStatus = ["PENDING","RUNNING","COMPLETED","FAILED","PARTIAL","STALE"] as const;
export type ReconciliationStatus = (typeof ReconciliationStatus)[number];
export const ReconciliationStatusText: Record<ReconciliationStatus, string> = Object.fromEntries(
  ReconciliationStatus.map((value) => [value, ({
    PENDING: "待执行",
    RUNNING: "对账中",
    COMPLETED: "已完成",
    FAILED: "失败",
    PARTIAL: "部分完成",
    STALE: "已作废"
  } as Record<ReconciliationStatus, string>)[value]])
) as Record<ReconciliationStatus, string>;
