# 角色设定
你是一位拥有 10 年经验的高级桌面应用架构师，精通 Tauri v2 (Rust) 与 React 19 生态。你的代码风格严谨、强调前后端（IPC）的高效解耦，并且对高阶 UI/UX 审美（独特的排版设计、富有创造力的微动效）有极高的追求。请帮我从零初始化一个用于分布式系统“查-发-查-比”的数据一致性自动化核对桌面工具。

# 项目背景
我们需要实现一个桌面端自动化集成测试工具。
核心业务链路为：
1. 前端输入用户标识（`custNo`）和测试报文。
2. Rust 后端根据 `custNo` 路由到指定的分库分表，查询接口触发前的数据状态。
3. Rust 后端调用业务 HTTP 接口（发送 JSON 报文）触发业务逻辑。
4. Rust 后端再次查询数据库，获取接口触发后的数据状态，并将前后数据返回给前端。
5. React 前端对前后两次数据库状态进行比对（Diff），并以高可视化的方式展示差异。

# 核心技术规范与架构设计
请严格按照以下规范实现代码：

## 1. Rust 后端：数据库路由与查询 (Tauri Commands)
- **分库分表拓扑**：共有 4 个物理库（`dcdpdb1` 至 `dcdpdb4`），每个库包含 2 张表，总计 8 张表（如 `tb_dpmst_medium_0001` 到 `tb_dpmst_medium_0008`）。
- **路由规则**：基于 `custNo` 计算 Hash 值（请预留独立的 `calculate_hash` 函数）。Hash 结果（1-8）对应表名后缀，库索引推导公式为 `(hash_result - 1) // 2 + 1`。
- **动态查询**：使用 `sqlx` 或 `mysql_async` crate，执行 `SELECT *` 查询。必须将结果动态映射为 `serde_json::Value` 返回给前端，不要硬编码任何具体的业务实体字段（Struct），保持绝对的动态兼容性。

## 2. Rust 后端：接口调用层 (Reqwest)
- 使用 `reqwest` 库发送 HTTP 报文。
- **强制要求**：在处理前端传来的 Payload 并发送时，必须确保 JSON 中的空值（`null`）被完整保留，绝不能在序列化或反序列化时丢失 `null` 元素。

## 3. React 19 前端：高阶 UI 与 Diff 引擎
- **高阶视觉设计**：拒绝平庸的默认组件堆砌。请采用赛博朋克或极简扁平化的高级质感，运用独特的字体排版（Typography）和创意性的转场/加载动效（如使用 Framer Motion）。
- **核心比对逻辑**：前端接收到 Rust 返回的 `pre_data` 和 `post_data` 后，使用可靠的 JSON Diff 库（如 `microdiff` 或自定义逻辑）进行比对。
- **比对视图**：实现一个直观的 Diff Viewer。
    - 必须支持忽略多条记录返回时的顺序差异（Ignore Order）。
    - 必须提供“噪音排除”配置项，支持使用正则表达式或指定 Key 排除不需要比对的动态字段（如 `update_time`, `version`, `trace_id`）。

## 4. 工程化与配置管理
- **插件使用**：使用 `tauri-plugin-store` (v2) 将数据库连接配置、API 基础地址、忽略字段白名单持久化存储在本地。
- **日志监控**：集成 `tauri-plugin-log`，在 UI 面板中提供一个抽屉或控制台区域，实时打印 Rust 后端的执行上下文（如路由到的库表名、请求 URL）。

# 输出任务
1. 请先输出完整的 Tauri 项目初始化命令与目录结构树（区分 `src-tauri` 和 `src`）。
2. 输出 Rust 后端核心代码（`main.rs`, `db.rs`, `api.rs` 的 Commands 实现）。
3. 输出 React 前端核心代码（包含调用 Tauri IPC 的逻辑，以及 Diff 渲染组件）。
4. 输出所需的 `Cargo.toml` 依赖和 `package.json` 依赖说明。
5.将编写好的代码自动上传到github上，github的地址为```https://github.com/Taylor-Ding/api_post_solo.git```，并编写github action实现打包并非发布不同平台的release版本，其中需要将所有依赖的环境也打包进来	；