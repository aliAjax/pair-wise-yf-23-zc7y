const readNumber = (key: string, fallback: number): number => {
  const raw = (import.meta.env as Record<string, string | undefined>)[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const RECONCILIATION_CONFIG = {
  batchCapacity: readNumber("VITE_RECONCILIATION_BATCH_CAPACITY", 200),
  overtimeToleranceMs: readNumber("VITE_RECONCILIATION_OVERTIME_TOLERANCE_MS", 500),
  failAtBatch: readNumber("VITE_RECONCILIATION_FAIL_AT_BATCH", -1),
  clockAlignDefaultMs: readNumber("VITE_RECONCILIATION_CLOCK_ALIGN_DEFAULT_MS", 0)
} as const;

export const APP_CONFIG = {
  appName: "stage-light",
  logEnabled: ((import.meta.env as Record<string, string | undefined>).VITE_LOG_ENABLED ?? "true") === "true"
} as const;
