import type { CueScene } from "../types/CueScene";
import type { TimelineTrack } from "../types/TimelineTrack";

export interface ScheduleItem {
  track_id: number;
  cue_scene_id: number;
  cue_name: string;
  start_ms: number;
  duration_ms: number;
  layer: string;
  priority: number;
  active_end_ms: number;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/** 本地编排（轨道 × 场景）规整为可对账的时间轴；非数值的历史字段按 0 兼容读回。 */
export function buildSchedule(tracks: TimelineTrack[], scenes: CueScene[]): ScheduleItem[] {
  const scenesById = new Map(scenes.map((scene) => [scene.id, scene]));
  return tracks
    .map((track) => {
      const scene = scenesById.get(track.cue_scene_id);
      const start = toFiniteNumber(track.start_ms, 0);
      const duration = Math.max(0, toFiniteNumber(track.duration_ms, 0));
      return {
        track_id: track.id,
        cue_scene_id: track.cue_scene_id,
        cue_name: scene?.name ?? `场景 ${track.cue_scene_id}`,
        start_ms: start,
        duration_ms: duration,
        layer: String(track.layer ?? ""),
        priority: toFiniteNumber(scene?.priority, 0),
        active_end_ms: start + duration
      };
    })
    .sort((a, b) => a.start_ms - b.start_ms || a.track_id - b.track_id);
}

/** 编排指纹：轨道与场景的关键字段摘要，编排改动后指纹变化，旧对账据此作废。 */
export function buildScheduleSignature(tracks: TimelineTrack[], scenes: CueScene[]): string {
  const trackPart = tracks
    .map((track) => [track.id, track.cue_scene_id, track.start_ms, track.duration_ms, track.layer, track.locked].join("~"))
    .join("|");
  const scenePart = scenes
    .map((scene) => [scene.id, scene.name, scene.fade_in_ms, scene.hold_ms, scene.priority, scene.scene_status].join("~"))
    .join("|");
  let hash = 5381;
  const source = `${trackPart}#${scenePart}`;
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) + hash + source.charCodeAt(i)) | 0;
  }
  return `sig_${(hash >>> 0).toString(36)}_${source.length}`;
}

/**
 * 在某场景的计划生效窗口内，是否被同层更高优先级的后续场景抢触发（覆盖）。
 * 仅用于给“已触发但被判覆盖”的条目提供预计算结果。
 */
export function findOverride(
  items: ScheduleItem[],
  self: ScheduleItem,
  triggerMs: number
): ScheduleItem | null {
  for (const other of items) {
    if (other.track_id === self.track_id) continue;
    if (other.layer !== self.layer) continue;
    if (other.priority <= self.priority) continue;
    if (other.start_ms >= self.start_ms && other.start_ms <= triggerMs) return other;
  }
  return null;
}
