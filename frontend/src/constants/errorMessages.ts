export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  CONSOLE_LOG_EMPTY: "控台执行记录为空，请先粘贴灯控台导出内容",
  CLOCK_ALIGNMENT_INVALID: "演出开始时间或控台时钟格式无法识别",
  RECONCILIATION_BATCH_FAILED: "第 {index} 批核对失败，已保留其它批次结果，可重试本批",
  REPORT_STALE: "编排已变更，旧对账结果已作废，请重新对账"
};
