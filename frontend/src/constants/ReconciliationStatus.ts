import { ReconciliationStatus } from "../types/ReconciliationStatus";

export const RECONCILIATION_STATUS_TEXT: Record<ReconciliationStatus, string> = {
  MATCHED: "按时执行",
  NOT_EXECUTED: "未执行",
  TIMEOUT: "超时",
  OVERRIDDEN: "被覆盖",
  ORPHAN: "无编排"
};
