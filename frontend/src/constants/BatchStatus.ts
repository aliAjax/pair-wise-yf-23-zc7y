import { BatchStatus } from "../types/BatchStatus";

export const BATCH_STATUS_TEXT: Record<BatchStatus, string> = {
  PENDING: "待核对",
  RUNNING: "核对中",
  DONE: "已完成",
  FAILED: "失败"
};
