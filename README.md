# 舞台灯光编排模拟器

纯前端舞台灯光编排工具，支持灯具通道、场景 Cue、时间轴预览和演出方案导出，所有数据存在 IndexedDB。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

前端：<http://localhost:20113>



## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`



## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + Redux Toolkit + IndexedDB |
| 后端 | - |
| 数据库 | 本地模拟数据 |
| 部署 | Docker Compose |

## 项目目录结构

```text
frontend/src/api, stores, types, constants, constructors, components/common, hooks, pages, router, utils, mocks
```

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `stage-light`
- `FRONTEND_PORT`: 前端端口，默认 `20113`


## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: stage-light`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-stage-light}` 前缀。
- 数据库使用命名卷，避免绑定中文路径。
- 常见问题：端口占用时修改 `.env` 中端口后重启；需要重置数据时执行 `docker compose down -v`。

## 枚举/常量出现位置清单

- FixtureType: constants/FixtureType、types/FixtureType、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- CueStatus: constants/CueStatus、types/CueStatus、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- ChannelMode: constants/ChannelMode、types/ChannelMode、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- ReconciliationStatus（MATCHED 按时执行 / NOT_EXECUTED 未执行 / TIMEOUT 超时 / OVERRIDDEN 被覆盖 / ORPHAN 无编排）: `types/ReconciliationStatus`、`constants/ReconciliationStatus`（文案）、`constants/statusText`（聚合）、`utils/reconciliationEngine`（判定）、`components/common/StatusBadge` 与 `ReconciliationResultTable`（徽标/筛选）、`pages/TimelinePage`（指标卡）。
- BatchStatus（PENDING / RUNNING / DONE / FAILED）: `types/BatchStatus`、`constants/BatchStatus`（文案）、`constants/statusText`、`stores/ReconciliationStore`、`workers/reconciliationWorker`、`components/common/ReconciliationProgress`。

## 执行对账台（/timeline）

时间轴页即“执行对账台”，把灯控台导出的执行记录粘贴进来后：

1. 按“演出开始时间 + 同一时刻控台时钟读数”计算时钟偏移，逐条把控台触发时刻对齐到本地相对毫秒（支持 `HH:MM:SS[.mmm]` 与 ISO 两种格式、跨零点）。
2. 逐条比对本地编排（TimelineTrack × CueScene）与实际触发时刻，输出五类条目：按时执行 / 未执行 / 超时（超过容差窗口）/ 被覆盖（同场景重复触发或被同层更高优先级场景抢触发）/ 无编排（孤儿记录）。
3. 报告带编排指纹（`utils/schedule.buildScheduleSignature`）：编排改动后旧对账自动标记为作废（stale），需重新对账，不自动重算。
4. 记录超过 `RECONCILIATION_BATCH_SIZE`（默认 200 条）时分批在 Web Worker 核对（`workers/reconciliationWorker`，无 Worker 环境回退主线程）；某批失败时保留已完成批次的结果，可仅重试失败批次。
5. 控台记录与报告持久化在 localStorage（键见 `constants/reconciliationConfig.STORAGE_KEYS`），刷新后自动回读。
6. 灯具通道快照按兼容方式读回（`utils/channelSnapshot`）：支持 `channels={"1":255}`、`channel_snapshot`、`1@255 2@128` 等写法；旧数据缺快照时返回 `null`，不阻断对账。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。

## License

MIT
