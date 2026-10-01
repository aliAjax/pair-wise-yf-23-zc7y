import { reconcileBatch, type ReconciliationBatchInput } from "../utils/reconciliationEngine";

export interface WorkerBatchRequest {
  type: "BATCH";
  payload: ReconciliationBatchInput & { failAtBatch: number };
}

export interface WorkerBatchResponse {
  type: "BATCH_DONE" | "BATCH_ERROR";
  payload: {
    batchIndex: number;
    results?: ReturnType<typeof reconcileBatch>;
    error?: string;
  };
}

const ctx = self as unknown as { postMessage: (message: WorkerBatchResponse) => void };

self.onmessage = (event: MessageEvent<WorkerBatchRequest>) => {
  const message = event.data;
  if (message.type !== "BATCH") return;
  const { failAtBatch, ...input } = message.payload;
  try {
    if (failAtBatch === input.batchIndex) {
      throw new Error("RECONCILIATION_BATCH_FAILED");
    }
    const results = reconcileBatch(input);
    ctx.postMessage({ type: "BATCH_DONE", payload: { batchIndex: input.batchIndex, results } });
  } catch (error) {
    ctx.postMessage({
      type: "BATCH_ERROR",
      payload: {
        batchIndex: input.batchIndex,
        error: error instanceof Error ? error.message : "RECONCILIATION_BATCH_FAILED"
      }
    });
  }
};
