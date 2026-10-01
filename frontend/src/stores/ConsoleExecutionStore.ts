import { create } from "zustand";
import type { ConsoleExecutionRecord } from "../types/ConsoleExecutionRecord";
import {
  listConsoleExecutionRecord,
  saveConsoleExecutionRecords,
  clearConsoleExecutionRecords
} from "../api/ConsoleExecutionRecord";
import { parseConsoleExport } from "../utils/reconciliationEngine";
import type { CueScene } from "../types/CueScene";

type State = {
  rows: ConsoleExecutionRecord[];
  loading: boolean;
  fallbackCount: number;
  load: () => Promise<void>;
  importText: (text: string, scenes: CueScene[]) => Promise<number>;
  clear: () => Promise<void>;
};

export const useConsoleExecutionStore = create<State>((set, get) => ({
  rows: [],
  loading: false,
  fallbackCount: 0,
  async load() {
    set({ loading: true });
    const rows = await listConsoleExecutionRecord();
    set({ rows, loading: false, fallbackCount: rows.filter((row) => row.snapshot_missing === "true").length });
  },
  async importText(text, scenes) {
    const { records, fallbackCount } = parseConsoleExport(text, scenes);
    if (records.length === 0) return 0;
    await saveConsoleExecutionRecords(records);
    set({ rows: records, fallbackCount });
    return records.length;
  },
  async clear() {
    await clearConsoleExecutionRecords();
    set({ rows: [], fallbackCount: 0 });
  }
}));
