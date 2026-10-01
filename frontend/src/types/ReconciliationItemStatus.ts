export const ReconciliationItemStatus = ["MATCHED","OVERTIME","MISSED","OVERRIDDEN","EXTRA"] as const;
export type ReconciliationItemStatus = (typeof ReconciliationItemStatus)[number];
export const ReconciliationItemStatusText: Record<ReconciliationItemStatus, string> = Object.fromEntries(
  ReconciliationItemStatus.map((value) => [value, ({
    MATCHED: "准时执行",
    OVERTIME: "超时",
    MISSED: "未执行",
    OVERRIDDEN: "被覆盖",
    EXTRA: "多余触发"
  } as Record<ReconciliationItemStatus, string>)[value]])
) as Record<ReconciliationItemStatus, string>;
