import type { TimelineTrack } from "../types/TimelineTrack";
import type { CueScene } from "../types/CueScene";
import type { ConsoleExecutionRecord } from "../types/ConsoleExecutionRecord";
import type { ReconciliationResultItem } from "../types/ReconciliationResultItem";
import { createDefaultConsoleExecutionRecord } from "../constructors/ConsoleExecutionRecordConstructor";
import { createDefaultReconciliationResultItem } from "../constructors/ReconciliationResultItemConstructor";
import { hashString, stableStringify } from "../utils/fingerprint";

export interface OrchestrationSnapshot {
  tracks: TimelineTrack[];
  scenes: CueScene[];
}

export interface AlignedConsoleRecord extends ConsoleExecutionRecord {
  aligned_ms: number;
}

export interface ReconciliationBatchInput {
  reconciliationId: number;
  batchIndex: number;
  tracks: TimelineTrack[];
  records: ConsoleExecutionRecord[];
  showStartConsoleMs: number;
  overtimeToleranceMs: number;
}

export function computeOrchestrationFingerprint({ tracks, scenes }: OrchestrationSnapshot): string {
  const payload = stableStringify({
    tracks: tracks.map((track) => ({
      id: track.id,
      cue_scene_id: track.cue_scene_id,
      start_ms: track.start_ms,
      duration_ms: track.duration_ms,
      layer: track.layer
    })),
    scenes: scenes.map((scene) => ({
      id: scene.id,
      fixture_states: scene.fixture_states,
      fade_in_ms: scene.fade_in_ms,
      hold_ms: scene.hold_ms
    }))
  });
  return `orch-${hashString(payload)}`;
}

export function alignConsoleClock(records: ConsoleExecutionRecord[], showStartConsoleMs: number): AlignedConsoleRecord[] {
  return records.map((record) => ({
    ...record,
    aligned_ms: record.triggered_at_ms - showStartConsoleMs
  }));
}

function parseFixtureStates(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

export function reconstructSnapshotFromScene(scene: CueScene | undefined): string {
  if (!scene) return "{}";
  const states = parseFixtureStates(scene.fixture_states);
  if (states) return JSON.stringify(states);
  return JSON.stringify({ scene_id: scene.id, scene_name: scene.name, channels: {} });
}

export function parseConsoleExport(text: string, scenes: CueScene[]): { records: ConsoleExecutionRecord[]; fallbackCount: number } {
  const trimmed = text.trim();
  if (!trimmed) return { records: [], fallbackCount: 0 };

  let rawRecords: unknown[] = [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      rawRecords = parsed;
    } else if (parsed && Array.isArray((parsed as { records?: unknown[] }).records)) {
      rawRecords = (parsed as { records: unknown[] }).records;
    } else {
      throw new Error("UNSUPPORTED_SHAPE");
    }
  } catch {
    const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      try {
        rawRecords.push(JSON.parse(line));
      } catch {
        throw new Error("RECONCILIATION_PARSE_FAILED");
      }
    }
  }

  const sceneMap = new Map(scenes.map((scene) => [scene.id, scene]));
  let fallbackCount = 0;
  const records = rawRecords.map((raw, index) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const cueSceneId = item.cue_scene_id === null || item.cue_scene_id === undefined || item.cue_scene_id === ""
      ? null
      : Number(item.cue_scene_id);
    const scene = cueSceneId !== null ? sceneMap.get(cueSceneId) : undefined;
    const rawSnapshot = item.fixture_channel_snapshot;
    const snapshotMissing = rawSnapshot === null || rawSnapshot === undefined || rawSnapshot === "" ||
      (typeof rawSnapshot === "object" && Object.keys(rawSnapshot as object).length === 0);
    if (snapshotMissing) fallbackCount += 1;
    return createDefaultConsoleExecutionRecord({
      id: typeof item.id === "number" ? item.id : index + 1,
      console_cue_id: item.console_cue_id !== undefined ? String(item.console_cue_id) : "",
      cue_scene_id: cueSceneId,
      triggered_at_ms: Number(item.triggered_at_ms ?? 0),
      fixture_channel_snapshot: snapshotMissing ? reconstructSnapshotFromScene(scene) : String(rawSnapshot),
      snapshot_missing: snapshotMissing ? "true" : "false",
      received_at: item.received_at !== undefined ? String(item.received_at) : new Date().toISOString()
    });
  });

  return { records, fallbackCount };
}

export function reconcileBatch(input: ReconciliationBatchInput): ReconciliationResultItem[] {
  const { reconciliationId, batchIndex, tracks, records, showStartConsoleMs, overtimeToleranceMs } = input;
  const aligned = alignConsoleClock(records, showStartConsoleMs);
  const recordsByScene = new Map<number, AlignedConsoleRecord[]>();
  for (const record of aligned) {
    if (record.cue_scene_id === null) continue;
    const list = recordsByScene.get(record.cue_scene_id) ?? [];
    list.push(record);
    recordsByScene.set(record.cue_scene_id, list);
  }
  for (const list of recordsByScene.values()) list.sort((a, b) => a.aligned_ms - b.aligned_ms);

  const matchedRecordIds = new Set<number>();
  const results: ReconciliationResultItem[] = [];

  for (const track of tracks) {
    const plannedStart = Number(track.start_ms) || 0;
    const duration = Number(track.duration_ms) || 0;
    const candidates = (recordsByScene.get(track.cue_scene_id) ?? [])
      .filter((record) => !matchedRecordIds.has(record.id))
      .sort((a, b) => Math.abs(a.aligned_ms - plannedStart) - Math.abs(b.aligned_ms - plannedStart));
    const match = candidates[0] ?? null;

    if (!match) {
      results.push(createDefaultReconciliationResultItem({
        id: results.length + 1,
        reconciliation_id: reconciliationId,
        timeline_track_id: track.id,
        cue_scene_id: track.cue_scene_id,
        status: "MISSED",
        planned_start_ms: plannedStart,
        actual_trigger_ms: -1,
        delay_ms: 0,
        detail: "控台未触发该场景",
        batch_index: batchIndex
      }));
      continue;
    }

    matchedRecordIds.add(match.id);
    const delay = match.aligned_ms - plannedStart;
    let status: string = "MATCHED";
    let detail = "准时执行";

    if (delay > overtimeToleranceMs) {
      status = "OVERTIME";
      detail = `超时 ${delay - overtimeToleranceMs}ms`;
    } else {
      const overridden = tracks.some((other) => {
        if (other.id === track.id || other.layer !== track.layer) return false;
        if (other.cue_scene_id === track.cue_scene_id) return false;
        const otherStart = Number(other.start_ms) || 0;
        if (otherStart <= plannedStart || otherStart >= plannedStart + duration) return false;
        const otherCandidates = recordsByScene.get(other.cue_scene_id) ?? [];
        return otherCandidates.some((record) => record.aligned_ms > match.aligned_ms && record.aligned_ms <= plannedStart + duration);
      });
      if (overridden) {
        status = "OVERRIDDEN";
        detail = "同层后续场景提前切入，本场景被覆盖";
      }
    }

    results.push(createDefaultReconciliationResultItem({
      id: results.length + 1,
      reconciliation_id: reconciliationId,
      timeline_track_id: track.id,
      cue_scene_id: track.cue_scene_id,
      status,
      planned_start_ms: plannedStart,
      actual_trigger_ms: match.aligned_ms,
      delay_ms: delay,
      detail,
      batch_index: batchIndex
    }));
  }

  for (const record of aligned) {
    if (record.cue_scene_id === null || matchedRecordIds.has(record.id)) continue;
    const planned = tracks.find((track) => track.cue_scene_id === record.cue_scene_id);
    if (planned) continue;
    results.push(createDefaultReconciliationResultItem({
      id: results.length + 1,
      reconciliation_id: reconciliationId,
      timeline_track_id: 0,
      cue_scene_id: record.cue_scene_id,
      status: "EXTRA",
      planned_start_ms: 0,
      actual_trigger_ms: record.aligned_ms,
      delay_ms: 0,
      detail: "控台触发但本地编排未包含",
      batch_index: batchIndex
    }));
  }

  return results;
}
