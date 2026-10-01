import { CONSOLE_LOG_DELIMITERS } from "../constants/reconciliationConfig";
import { ERROR_CODES } from "../constants/errorCodes";
import type { ConsoleExecutionRecord } from "../types/ConsoleExecutionRecord";
import { createConsoleExecutionRecordForm } from "../constructors/ConsoleExecutionRecordConstructor";
import { alignConsoleTime } from "./clockAlignment";
import { readChannelSnapshot, extractChannelsFromLine } from "./channelSnapshot";

export interface ParsedConsoleLog {
  records: ConsoleExecutionRecord[];
  errors: { line: number; text: string }[];
}

export interface ParsedRow {
  record: ConsoleExecutionRecord;
  warning: string | null;
}

const HEADER_HINTS = ["cue", "scene", "time", "时间", "场景", "序号"];

/**
 * 解析灯控台导出的执行记录文本。
 * 行格式宽松：首列序号/时间/Cue 号均可识别；表头自动跳过；
 * 单行失败不影响其它行，收集到 errors 返回；时间列损坏的行保留记录并告警。
 */
export function parseConsoleLog(text: string): ParsedConsoleLog {
  const records: ConsoleExecutionRecord[] = [];
  const errors: { line: number; text: string }[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const cells = trimmed.split(CONSOLE_LOG_DELIMITERS).map((cell) => cell.trim()).filter(Boolean);
    if (cells.length === 0) return;
    if (line === 1 && HEADER_HINTS.some((hint) => trimmed.toLowerCase().includes(hint)) && Number.isNaN(Number(cells[0]))) {
      return;
    }
    const parsed = parseRow(cells, trimmed);
    if (parsed) {
      records.push(parsed.record);
      if (parsed.warning) errors.push({ line, text: parsed.warning });
    } else {
      errors.push({ line, text: trimmed });
    }
  });

  return { records, errors };
}

function parseRow(cells: string[], rawLine: string): ParsedRow | null {
  let rest = [...cells];
  let seq = NaN;
  if (rest.length >= 3 && /^\d+$/.test(rest[0])) {
    seq = Number(rest.shift());
  }
  const rawTime = rest[0] ?? "";
  const timeValid = looksLikeTime(rawTime);
  // 时间列无法识别时在前面补空列，使 Cue 号/名称仍按原列位读取；
  // 记录保留（elapsed_ms 为 null），由对账判为时间异常并计“未执行”。
  if (!timeValid) rest.unshift("");
  const cueNo = rest[1] ?? "";
  const cueName = rest[2] ?? cueNo;
  if (!cueNo) return null;
  const jsonCell = rest.slice(3).find((cell) => cell.trim().startsWith("{"));
  const channels = extractChannelsFromLine(rawLine) ?? (jsonCell ? readChannelSnapshot(jsonCell) : null);
  const record = createConsoleExecutionRecordForm({
    seq: Number.isNaN(seq) ? 0 : seq,
    raw_time: rawTime,
    cue_no: cueNo,
    cue_name: cueName,
    cue_scene_id: cueSceneIdFromCueNo(cueNo),
    channels,
    raw_line: rawLine
  });
  return { record, warning: timeValid ? null : `时间「${rawTime}」无法识别，该行将按未执行处理：${rawLine}` };
}

function looksLikeTime(value: string): boolean {
  if (/^\d{1,2}:\d{2}(:\d{2})?([.,]\d{1,3})?$/.test(value)) return true;
  return !Number.isNaN(Date.parse(value));
}

/** 控台 Cue 号形如 "Q12" / "CUE 12" / "12" 时回推出本地场景 id。 */
function cueSceneIdFromCueNo(cueNo: string): number | null {
  const match = /(\d+)\s*$/.exec(cueNo.trim());
  if (!match) return null;
  return Number(match[1]);
}

export function assertLogNotEmpty(records: ConsoleExecutionRecord[]) {
  if (records.length === 0) {
    throw Object.assign(new Error("CONSOLE_LOG_EMPTY"), { code: ERROR_CODES.CONSOLE_LOG_EMPTY });
  }
}

/** 将解析出的记录按演出开始时间与控台偏移逐条对齐；无法识别的时间保留 null 并计入失败。 */
export function alignRecords(
  records: ConsoleExecutionRecord[],
  showStartedAt: string,
  clockOffsetMs: number
): ConsoleExecutionRecord[] {
  return records.map((record) => ({
    ...record,
    elapsed_ms: alignConsoleTime(record.raw_time, showStartedAt, clockOffsetMs)
  }));
}
