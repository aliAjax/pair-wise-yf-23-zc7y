import { ERROR_CODES } from "../constants/errorCodes";

const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3}))?)?$/;
const DAY_MS = 24 * 3_600_000;

/** 控台时钟读数（HH:MM 或 HH:MM:SS[.mmm]）→ 当天毫秒；无法识别返回 null。 */
export function parseClockToMs(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const match = CLOCK_PATTERN.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  const fraction = match[4] ? Number(match[4].padEnd(3, "0")) : 0;
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3_600_000 + minutes * 60_000 + seconds * 1_000 + fraction;
}

/** 取一个时间（时钟读数或 ISO 绝对时间）在当天内的毫秒数。 */
function toMillisOfDay(value: string): number | null {
  const clock = parseClockToMs(value);
  if (clock !== null) return clock;
  const absolute = Date.parse(value);
  if (Number.isNaN(absolute)) return null;
  const date = new Date(absolute);
  return date.getHours() * 3_600_000 + date.getMinutes() * 60_000 + date.getSeconds() * 1_000 + date.getMilliseconds();
}

/**
 * 计算控台时钟相对演出开始的偏移（毫秒）。
 * 两个时间可分别为 HH:MM:SS 读数或 ISO 绝对时间；
 * 支持跨零点（最短时间差，超过 ±12 小时自动折到对侧）。
 */
export function resolveClockOffset(showStartedAt: string, consoleClockAtShowStart: string): number {
  const showMs = toMillisOfDay(showStartedAt);
  const consoleMs = toMillisOfDay(consoleClockAtShowStart);
  if (showMs === null || consoleMs === null) {
    throw Object.assign(new Error("CLOCK_ALIGNMENT_INVALID"), { code: ERROR_CODES.CLOCK_ALIGNMENT_INVALID });
  }
  let offset = (consoleMs - showMs) % DAY_MS;
  if (offset > 12 * 3_600_000) offset -= DAY_MS;
  if (offset < -12 * 3_600_000) offset += DAY_MS;
  return offset;
}

/** 把控台记录上的时间原文对齐到演出相对毫秒。ISO 时间走绝对差，时钟读数走当天差并补跨零点。 */
export function alignConsoleTime(rawTime: string, showStartedAt: string, clockOffsetMs: number): number | null {
  const text = rawTime.trim();
  if (!text) return null;
  const absolute = Date.parse(text);
  if (!Number.isNaN(absolute)) {
    const showAbsolute = Date.parse(showStartedAt);
    if (!Number.isNaN(showAbsolute)) {
      return absolute - showAbsolute;
    }
    // 演出开始填的是时钟读数时，取两者的“当天毫秒”做差；
    // 超过 ±12 小时按跨零点折叠，否则保留正负号（负=早于开始触发）。
    const anchorClock = toMillisOfDay(showStartedAt);
    if (anchorClock === null) return null;
    const recordClock = toMillisOfDay(text);
    if (recordClock === null) return null;
    let elapsed = recordClock - anchorClock - clockOffsetMs;
    if (elapsed > 12 * 3_600_000) elapsed -= DAY_MS;
    if (elapsed < -12 * 3_600_000) elapsed += DAY_MS;
    return elapsed;
  }
  const recordMs = parseClockToMs(text);
  const startMs = toMillisOfDay(showStartedAt);
  if (recordMs === null || startMs === null) return null;
  let elapsed = (recordMs - startMs - clockOffsetMs) % DAY_MS;
  if (elapsed < -12 * 3_600_000) elapsed += DAY_MS;
  if (elapsed < 0) elapsed += DAY_MS;
  return elapsed;
}
