/** 单批核对的记录容量上限；超过则分批核对。 */
export const RECONCILIATION_BATCH_SIZE = 200;

/** 同一批次失败后的最大重试次数（不含首次执行）。 */
export const RECONCILIATION_MAX_ATTEMPTS = 2;

/** 默认触发容差（毫秒）：|实际触发 - 编排开始| 在该窗口内视为按时。 */
export const RECONCILIATION_DEFAULT_TOLERANCE_MS = 2000;

/** 控台导出记录支持的分隔符（制表符、逗号、分号、竖线、连续空白）。 */
export const CONSOLE_LOG_DELIMITERS = /\t+|[,;|]|\s{2,}/;

export const STORAGE_KEYS = {
  consoleLog: "stage-light:console-log",
  report: "stage-light:reconciliation-report"
} as const;
