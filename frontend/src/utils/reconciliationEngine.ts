import type {
  ConsoleExecutionRecord,
  ReconciliationEntryDraft
} from "../types/ConsoleExecutionRecord";
import type { ClockAlignment } from "../types/ReconciliationReport";
import type { ScheduleItem } from "./schedule";
import { findOverride } from "./schedule";

export interface PreparedConsoleRecord extends ConsoleExecutionRecord {
  matched_item: ScheduleItem | null;
  override_item: ScheduleItem | null;
  is_orphan: boolean;
}

/**
 * 将控台记录匹配到本地编排条目（先按场景 id，再按场景名）。
 * 时间无法对齐或找不到编排的记录标记为孤儿，交由后续分批处理。
 */
export function prepareRecords(records: ConsoleExecutionRecord[], schedule: ScheduleItem[]): PreparedConsoleRecord[] {
  const bySceneId = new Map<number, ScheduleItem>();
  const bySceneName = new Map<string, ScheduleItem>();
  for (const item of schedule) {
    if (!bySceneId.has(item.cue_scene_id)) bySceneId.set(item.cue_scene_id, item);
    bySceneName.set(item.cue_name.toLowerCase(), item);
  }

  return records.map((record) => {
    const matched =
      (record.cue_scene_id !== null ? bySceneId.get(record.cue_scene_id) ?? null : null) ??
      bySceneName.get(record.cue_name.trim().toLowerCase()) ??
      null;
    if (!matched || record.elapsed_ms === null) {
      return { ...record, matched_item: matched, override_item: null, is_orphan: true };
    }
    const override = findOverride(schedule, matched, record.elapsed_ms);
    return { ...record, matched_item: matched, override_item: override, is_orphan: false };
  });
}

/** 将整单切成等容批次：编排条目与控台记录按顺序轮转到各批，保证每批可独立重试。 */
export function planBatches(itemCount: number, recordCount: number, batchSize: number): number {
  return Math.max(1, Math.ceil(Math.max(itemCount, recordCount) / batchSize));
}

function assignBucket(index: number, batchCount: number): number {
  return index % batchCount;
}

export function buildBatchPlan<T>(rows: T[], batchCount: number): T[][] {
  const buckets: T[][] = Array.from({ length: batchCount }, () => []);
  rows.forEach((row, index) => buckets[assignBucket(index, batchCount)].push(row));
  return buckets;
}

/**
 * 关键：控台记录必须按其匹配到的编排条目所在批次归并，
 * 否则同一 cue 的“编排条目”和“实际触发”会被拆到两批，误判为未执行/无编排。
 * 孤儿记录（无匹配条目或时间无法对齐）在批次间轮转分摊，保证大批量时容量均衡。
 */
export function groupRecordsByItemBatch(
  records: PreparedConsoleRecord[],
  items: ScheduleItem[],
  batchCount: number
): PreparedConsoleRecord[][] {
  const buckets: PreparedConsoleRecord[][] = Array.from({ length: batchCount }, () => []);
  const itemBatchByTrack = new Map<number, number>();
  items.forEach((item, index) => itemBatchByTrack.set(item.track_id, assignBucket(index, batchCount)));
  let orphanCursor = 0;
  for (const record of records) {
    // 时间无法解析的记录即便匹配到场景，也与该场景条目同批：
    // 引擎会同时产出“未执行”（条目侧）与“无编排/时间异常”（记录侧）。
    const trackId = record.matched_item?.track_id ?? null;
    const batch = trackId !== null ? itemBatchByTrack.get(trackId) : undefined;
    if (batch === undefined) {
      buckets[assignBucket(orphanCursor, batchCount)].push(record);
      orphanCursor += 1;
    } else {
      buckets[batch].push(record);
    }
  }
  return buckets;
}

/**
 * 单批核对：本地编排条目 + 分摊到本批的控台记录 → 对账条目草稿。
 * 输出五类：未执行 / 超时 / 被覆盖 / 按时执行 / 无编排。
 */
export function reconcileBatch(
  items: ScheduleItem[],
  records: PreparedConsoleRecord[],
  alignment: ClockAlignment,
  batchIndex: number
): ReconciliationEntryDraft[] {
  const tolerance = Math.max(0, alignment.tolerance_ms);
  const entries: ReconciliationEntryDraft[] = [];

  const recordsForItem = (item: ScheduleItem): PreparedConsoleRecord[] =>
    records.filter((record) => !record.is_orphan && record.matched_item?.track_id === item.track_id);

  for (const item of items) {
    const hits = recordsForItem(item).sort((a, b) => (a.elapsed_ms ?? 0) - (b.elapsed_ms ?? 0));
    if (hits.length === 0) {
      entries.push({
        track_id: item.track_id,
        cue_scene_id: item.cue_scene_id,
        cue_name: item.cue_name,
        scheduled_ms: item.start_ms,
        triggered_ms: null,
        delta_ms: null,
        layer: item.layer,
        priority: item.priority,
        status: "NOT_EXECUTED",
        reason: "控台执行记录中未找到该场景的触发",
        console_seq: null,
        channels: null
      });
      continue;
    }

    hits.forEach((record, hitIndex) => {
      const triggered = record.elapsed_ms ?? 0;
      const delta = triggered - item.start_ms;
      const duplicate = hitIndex > 0;
      const overridden = record.override_item !== null;
      let status: ReconciliationEntryDraft["status"];
      let reason: string;
      if (duplicate) {
        status = "OVERRIDDEN";
        reason = `同一场景被控台重复触发，首条已采用（${record.raw_time}）`;
      } else if (overridden) {
        status = "OVERRIDDEN";
        reason = `${record.raw_time} 触发后被更高优先级场景「${record.override_item?.cue_name}」覆盖`;
      } else if (Math.abs(delta) > tolerance) {
        status = "TIMEOUT";
        reason = `触发偏离编排 ${formatDelta(delta)}，超过容差 ±${tolerance}ms`;
      } else {
        status = "MATCHED";
        reason = `触发偏离 ${formatDelta(delta)}，在容差窗口内`;
      }
      entries.push({
        track_id: item.track_id,
        cue_scene_id: item.cue_scene_id,
        cue_name: item.cue_name,
        scheduled_ms: item.start_ms,
        triggered_ms: triggered,
        delta_ms: delta,
        layer: item.layer,
        priority: item.priority,
        status,
        reason,
        console_seq: record.seq,
        channels: record.channels
      });
    });
  }

  for (const record of records) {
    // 真正无匹配 → 无编排；有匹配但时间无法对齐 → 记录侧补一条异常，条目侧已计“未执行”。
    if (!record.is_orphan) continue;
    const unmatchedItem = record.matched_item === null;
    entries.push({
      track_id: null,
      cue_scene_id: record.cue_scene_id,
      cue_name: record.matched_item?.cue_name ?? (record.cue_name || `控台记录 #${record.seq || batchIndex}`),
      scheduled_ms: unmatchedItem ? null : record.matched_item?.start_ms ?? null,
      triggered_ms: record.elapsed_ms,
      delta_ms: null,
      layer: record.matched_item?.layer ?? "",
      priority: record.matched_item?.priority ?? null,
      status: "ORPHAN",
      reason:
        record.elapsed_ms === null
          ? unmatchedItem
            ? `时间「${record.raw_time}」无法对齐到演出时钟`
            : `场景匹配到「${record.matched_item?.cue_name}」，但时间「${record.raw_time}」无法对齐，按未执行处理`
          : "控台触发了本地编排中不存在的场景",
      console_seq: record.seq,
      channels: record.channels
    });
  }

  // 所有 matched 记录均在上面的 hits 循环中消费，剩余孤儿记录在下方补录。
  return entries;
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? "晚 " : delta < 0 ? "早 " : "";
  return `${sign}${Math.abs(delta)}ms`;
}
