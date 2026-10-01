export const formatDate = (value: string) => new Date(value).toLocaleString("zh-CN");
export const formatStatus = (value: string) => value.replace(/_/g, " ");
export const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value);
export const formatRisk = (value: string) => ({ LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "严重", EXTREME: "极高" }[value] ?? value);

export const formatMs = (value: number) => {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs < 1000) return `${sign}${abs}ms`;
  const seconds = abs / 1000;
  return `${sign}${seconds.toFixed(abs < 10000 ? 2 : 1)}s`;
};

export const formatClockDelta = (value: number) => {
  if (!Number.isFinite(value)) return "未触发";
  if (value === 0) return "准时";
  return `${value > 0 ? "延后" : "提前"} ${formatMs(Math.abs(value))}`;
};

export const formatPercent = (value: number, total: number) => {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
};
