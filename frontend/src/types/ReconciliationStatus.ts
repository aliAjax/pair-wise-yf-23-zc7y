export const ReconciliationStatus = ["MATCHED", "NOT_EXECUTED", "TIMEOUT", "OVERRIDDEN", "ORPHAN"] as const;
export type ReconciliationStatus = (typeof ReconciliationStatus)[number];
