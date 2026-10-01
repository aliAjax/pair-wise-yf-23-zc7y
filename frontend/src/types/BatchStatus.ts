export const BatchStatus = ["PENDING", "RUNNING", "DONE", "FAILED"] as const;
export type BatchStatus = (typeof BatchStatus)[number];
