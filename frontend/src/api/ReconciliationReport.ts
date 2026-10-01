import { LOG_TEMPLATES } from "../constants/logTemplates";
import { STORAGE_KEYS } from "../constants/reconciliationConfig";
import type { ReconciliationReport } from "../types/ReconciliationReport";

const endpoint = "/api/reconciliation-report";

export async function listReconciliationReport(): Promise<ReconciliationReport | null> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    // 预留服务端回读位，当前版本只走本地持久化。
  }
  const raw = localStorage.getItem(STORAGE_KEYS.report);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReconciliationReport;
  } catch {
    return null;
  }
}

export async function saveReconciliationReport(payload: ReconciliationReport): Promise<ReconciliationReport> {
  console.info(LOG_TEMPLATES.Reconciliation[1], {
    entries: payload.entries.length,
    batches: payload.batches.length,
    stale: payload.stale
  });
  localStorage.setItem(STORAGE_KEYS.report, JSON.stringify(payload));
  return payload;
}

export async function markReportStale(signature: string): Promise<void> {
  const raw = localStorage.getItem(STORAGE_KEYS.report);
  if (!raw) return;
  try {
    const report = JSON.parse(raw) as ReconciliationReport;
    if (report.schedule_signature !== signature && !report.stale) {
      console.info(LOG_TEMPLATES.Reconciliation[3], { from: report.schedule_signature, to: signature });
      localStorage.setItem(STORAGE_KEYS.report, JSON.stringify({ ...report, stale: true }));
    }
  } catch {
    // 损坏的旧报告直接忽略，下次对账覆盖。
  }
}
