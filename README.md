# 舞台灯光编排模拟器

纯前端舞台灯光编排工具，支持灯具通道、场景 Cue、时间轴预览、演出方案导出和**演出执行对账**，所有数据存在 IndexedDB / localStorage。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

前端：<http://localhost:20113>

## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`
- 类型检查：`cd frontend && npm run build`（含 `tsc -b`）

## 核心功能

### 演出执行对账台（时间轴页 `/timeline`）

演出结束后灯光师可把灯控台导出的执行记录贴进来，按演出开始时间对齐控台时钟，逐条比对本地编排场景与控台实际触发时刻：

1. **粘贴控台执行记录**：支持 JSON 数组或 JSON Lines；记录缺少灯具通道快照时自动按兼容方式读回（从场景 `fixture_states` 重建），并标记 `snapshot_missing=true`。
2. **对齐控台时钟**：输入演出开始时控台时钟读数（ms），对账以此时钟零点对齐本地编排时间轴。
3. **逐条比对**：输出准时、超时（延迟超容差）、未执行、被覆盖（同层后续场景提前切入）、多余触发五类结论。
4. **编排作废重算**：编排指纹（tracks + scenes 稳定哈希）变更后，旧对账结果标记 `STALE` 作废，需重新对账。
5. **分批核对**：记录超出单批容量（默认 200 条）时自动拆批，Web Worker 逐批计算，进度实时落盘。
6. **断点重试**：某批失败时保留已完成批次（状态 `PARTIAL`），修复后从断点批次继续，不丢失已完成结果。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + Redux Toolkit + IndexedDB |
| 对账计算 | Web Worker + 纯函数对账引擎 |
| 数据库 | 本地模拟数据 + localStorage 持久化 |
| 部署 | Docker Compose |

## 项目目录结构

```text
frontend/src/
├── api/                  # 按模型分文件的 async API（含对账记录、控台执行记录持久化）
├── stores/               # 独立 store（zustand），禁止全放组件 state
├── types/                # 数据模型类型定义
├── constants/            # 枚举、日志模板、错误信息、状态文案
├── constructors/         # 默认对象、表单对象、响应对象构造器
├── components/common/    # 共享组件（含对账台各子组件）
├── hooks/                # 自定义 hook（useReconciliation 等）
├── pages/                # 路由页面
├── router/
├── utils/                # 格式化、指纹、对账引擎
├── mocks/                # 本地模拟数据（含控台执行记录示例）
├── config/               # 全局配置（分批容量、超时容差、失败注入点）
└── workers/              # Web Worker 分批对账
```

## 环境变量说明

根目录 `.env`：

- `COMPOSE_PROJECT_NAME`：Compose 项目名，默认 `stage-light`
- `FRONTEND_PORT`：前端端口，默认 `20113`

前端 `frontend/.env.example`（Vite 构建期读取，均有默认值）：

- `VITE_RECONCILIATION_BATCH_CAPACITY`：单批核对容量，默认 `200`
- `VITE_RECONCILIATION_OVERTIME_TOLERANCE_MS`：超时容差（ms），默认 `500`
- `VITE_RECONCILIATION_FAIL_AT_BATCH`：失败注入批次（用于演示断点重试），默认 `-1`（不注入）
- `VITE_RECONCILIATION_CLOCK_ALIGN_DEFAULT_MS`：控台时钟对齐默认值，默认 `0`
- `VITE_LOG_ENABLED`：日志开关，默认 `true`

## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: stage-light`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-stage-light}-frontend`。
- 数据库使用命名卷，避免绑定中文路径。
- 常见问题：端口占用时修改 `.env` 中端口后重启；需要重置数据时执行 `docker compose down -v`。

## 枚举/常量出现位置清单

- FixtureType: constants/FixtureType、types/FixtureType、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- CueStatus: constants/CueStatus、types/CueStatus、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- ChannelMode: constants/ChannelMode、types/ChannelMode、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- ReconciliationStatus: constants/ReconciliationStatus、types/ReconciliationStatus、constants/statusText、constructors/ReconciliationRecordConstructor、stores/ReconciliationStore、components/common/StaleBanner、pages/TimelinePage 均有引用。
- ReconciliationItemStatus: constants/ReconciliationItemStatus、types/ReconciliationItemStatus、constants/statusText、constructors/ReconciliationResultItemConstructor、utils/reconciliationEngine、components/common/ReconciliationResultTable 均有引用。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。对账功能在此基础上进一步拆分出引擎、Worker、断点持久化与指纹作废，任何一个比对规则的调整都会同时触及引擎、Worker、store 与展示组件。

## License

MIT
