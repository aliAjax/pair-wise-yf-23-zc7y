export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  RECONCILIATION_CAPACITY_EXCEEDED: "对账记录超出单批容量，已自动分批核对",
  RECONCILIATION_BATCH_FAILED: "对账批次执行失败，已保留已完成批次，可断点重试",
  RECONCILIATION_SNAPSHOT_MISSING: "控台记录缺少灯具通道快照，已按兼容方式读回",
  RECONCILIATION_FINGERPRINT_MISMATCH: "编排已变更，旧对账结果已作废，请重新对账",
  RECONCILIATION_PARSE_FAILED: "控台执行记录解析失败，请检查粘贴内容格式",
  RECONCILIATION_CLOCK_ALIGN_FAILED: "控台时钟对齐失败，请检查演出开始时间"
};
