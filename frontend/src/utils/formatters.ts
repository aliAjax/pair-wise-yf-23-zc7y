export const formatDate = (value: string) => new Date(value).toLocaleString("zh-CN");
export const formatStatus = (value: string) => value.replace(/_/g, " ");
export const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value);
export const formatRisk = (value: string) => ({ LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "严重", EXTREME: "极高" }[value] ?? value);

/** 毫秒偏移：+1200 → "晚 1.2s"，-800 → "早 0.8s"，null → "—"。 */
export const formatMsDelta = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return "—";
  const seconds = value / 1000;
  const text = `${Math.abs(seconds).toFixed(1)}s`;
  if (value > 0) return `晚 ${text}`;
  if (value < 0) return `早 ${text}`;
  return "0s";
};

/** 相对演出开始的毫秒时间轴坐标：65000 → "01:05.000"。 */
export const formatElapsedMs = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return "—";
  const total = Math.max(0, value);
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1_000);
  const millis = total % 1_000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
};
