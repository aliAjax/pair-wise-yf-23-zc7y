import { LOG_TEMPLATES } from "../constants/logTemplates";
import { STORAGE_KEYS } from "../constants/reconciliationConfig";

const endpoint = "/api/console-execution-record";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadConsoleLog(): Promise<string> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    // 预留远程灯控台对接位，当前版本只走本地持久化。
  }
  return localStorage.getItem(STORAGE_KEYS.consoleLog) ?? "";
}

export async function saveConsoleLog(text: string): Promise<string> {
  console.info(LOG_TEMPLATES.Reconciliation[0], { length: text.length });
  localStorage.setItem(STORAGE_KEYS.consoleLog, text);
  return text;
}

export async function loadPersistedJson<T>(key: keyof typeof STORAGE_KEYS, fallback: T): Promise<T> {
  return safeParse(localStorage.getItem(STORAGE_KEYS[key]), fallback);
}

export async function persistJson(key: keyof typeof STORAGE_KEYS, value: unknown): Promise<void> {
  localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
}
