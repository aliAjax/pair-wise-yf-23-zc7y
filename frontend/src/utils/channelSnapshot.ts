/**
 * 灯具通道快照的兼容读取。
 * 历史/第三方导出可能使用 channels / channel_snapshot / fixture_channels 等键，
 * 也可能是 JSON 字符串或 "1@255,2@128" 文本；旧数据缺快照时返回 null，不阻断对账。
 */
export type ChannelSnapshot = Record<string, number> | null;

export function readChannelSnapshot(source: unknown): ChannelSnapshot {
  if (source === null || source === undefined) return null;
  if (typeof source === "string") {
    const text = source.trim();
    if (!text) return null;
    if (text.startsWith("{")) {
      try {
        return normalizeSnapshot(JSON.parse(text));
      } catch {
        return null;
      }
    }
    return parseDmxPairs(text);
  }
  return normalizeSnapshot(source);
}

function normalizeSnapshot(value: unknown): ChannelSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const level = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(level)) result[String(key)] = level;
  }
  return Object.keys(result).length > 0 ? result : null;
}

export function extractDmxPairs(text: string): ChannelSnapshot {
  const result: Record<string, number> = {};
  // 先剔除日期时间与时钟片段（2026-10-01T20:00:10、20:00:13.000），避免数字被误当成通道号。
  const scrubbed = text
    .replace(/\d{4}-\d{2}-\d{2}[T\s][\d:.,+-Zz]*/g, " ")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2}(?:[.,]\d{1,3})?)?\b/g, " ");
  const pattern = /(\d+)\s*[@=:]\s*(\d+(?:\.\d+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(scrubbed)) !== null) {
    result[match[1]] = Number(match[2]);
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * 从控台日志整行中尽力抽取通道快照，兼容多种历史写法：
 * channels={"3":200} / channel_snapshot: {"1":255} / 1@255 2@128 / fixture_channels=5@10。
 * 时间片段（非 @/=/: 配对的数字）不会被纳入。
 */
export function extractChannelsFromLine(rawLine: string): ChannelSnapshot {
  const jsonMatch = /(?:channels?|channel_snapshot|fixture_channels|channelLevels)\s*[:=]\s*(\{[^{}]*\})/i.exec(rawLine);
  if (jsonMatch) {
    const snapshot = readChannelSnapshot(jsonMatch[1]);
    if (snapshot) return snapshot;
  }
  return extractDmxPairs(rawLine);
}

function parseDmxPairs(text: string): ChannelSnapshot {
  const result: Record<string, number> = {};
  for (const pair of text.split(/[,;]/)) {
    const match = /^\s*([^@=:]+)\s*[@=:]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(pair);
    if (!match) continue;
    result[match[1].trim()] = Number(match[2]);
  }
  return Object.keys(result).length > 0 ? result : null;
}

export function pickChannelSnapshot(record: Record<string, unknown>): ChannelSnapshot {
  for (const key of ["channels", "channel_snapshot", "fixture_channels", "channelLevels"]) {
    if (record[key] !== undefined) {
      const snapshot = readChannelSnapshot(record[key]);
      if (snapshot) return snapshot;
    }
  }
  return null;
}
