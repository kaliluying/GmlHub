# AGENTS.md

本文件面向在本仓库工作的 agent（含人类开发者）。
目标：快速、安全、一致地完成修改。

## 1. 项目概览

- 技术栈：Vue 3 + Vite + Pinia + Tailwind CSS + PostCSS。
- 包管理：npm（存在 `package-lock.json`）。
- 代码形态：以 JavaScript + Vue SFC（`<script setup>`）为主，未启用 TypeScript。
- 当前状态：仓库包含 UI 原型代码，测试与 lint 尚未接入。

## 2. 仓库结构（高频路径）

- `src/main.js`：应用入口，挂载 Pinia。
- `src/App.vue`：根组件。
- `src/components/desktop/`：桌面 UI 组件（`Desktop.vue`、`Window.vue`、`Dock.vue`、`AppIcon.vue`）。
- `src/stores/desktop.js`：核心状态与行为（窗口管理、主题切换、壁纸设置）。
- `src/style.css`：全局样式与 Tailwind 组件层扩展。
- `tailwind.config.js`：Tailwind 主题扩展、动画、darkMode 设置。
- `vite.config.js`：Vite + Vue 插件配置。

## 3. 构建 / 运行 / 质量命令

### 3.1 已配置命令（直接可用）

- 启动开发环境：`npm run dev`
- 生产构建：`npm run build`
- 本地预览构建产物：`npm run preview`
- 当前的环境是Windows，建议在Windows环境下运行。
- 使用powershell运行命令，避免使用cmd。

### 3.2 未配置但常被误用的命令

- `npm run lint`：当前不存在（`package.json` 无 `lint` script）。
- `npm test` / `npm run test`：当前不存在（`package.json` 无 `test` script）。

### 3.3 单测执行（重点）

- 当前仓库未接入测试框架（无 Vitest/Jest 配置、无 `src/**/*.{test,spec}.*` 测试文件）。
- 结论：当前“运行单个测试”命令不可用。
- 若后续引入 Vitest，建议统一 script：
  - `"test": "vitest"`
  - `"test:watch": "vitest --watch"`
  - `"test:run": "vitest run"`
  - `"test:one": "vitest run"`（通过追加文件路径执行单测）
- Vitest 单文件示例：`npm run test:one -- src/stores/desktop.test.js`
- Vitest 单用例示例：`npm run test:one -- src/stores/desktop.test.js -t "openWindow"`

## 4. 代码风格基线（基于现有代码）

### 4.1 Vue 与组件组织

- 使用 Vue SFC，默认采用 `<script setup>`。
- 常见区块顺序：`<template>` -> `<script setup>` -> `<style scoped>`。
- 组件文件名采用 PascalCase（如 `Desktop.vue`、`AppIcon.vue`）。
- 组件目录按业务域聚合（当前为 `components/desktop/`）。

### 4.2 JavaScript 书写习惯

- 使用 ESM import/export。
- 字符串以单引号为主。
- 缩进为 2 空格。
- 普遍不写分号（保持与现有文件一致）。
- 对象/数组多行声明保留尾随逗号。
- 倾向使用 `const`，仅在必要时使用 `let`。

### 4.3 Import 约定

- 先第三方依赖，再项目内相对路径。
- 相对路径明确到扩展名（现有 JS import 常显式写 `.js`）。
- 样式入口在 `main.js` 中集中引入（`import './style.css'`）。

### 4.4 命名约定

- Store 命名：`useXxxStore`（如 `useDesktopStore`）。
- 组合式变量：状态 `xxx`，计算属性 `isXxx` / `openXxx`，行为函数使用动词短语。
- 事件处理函数常见前缀：`handleXxx`、`startXxx`、`toggleXxx`。
- 布尔状态命名优先 `is/has/can` 前缀（如 `isDarkMode`、`isDragging`）。

### 4.5 状态管理（Pinia）

- 采用 setup store：`defineStore('name', () => { ... })`。
- `ref` 持有状态，`computed` 提供派生状态，函数对外暴露行为。
- 改动窗口状态时保持一致更新：`focused`、`minimized`、`activeWindowId`、`zIndex`。

### 4.6 错误处理与防御式编程

- 当前代码偏向“早返回”防御（例如对象不存在时 `if (!app) return`）。
- 暂未形成统一异常体系（几乎无 `try/catch`、无全局错误边界）。
- 新增逻辑建议：
  - 优先用参数校验 + 早返回，避免无意义深层嵌套。
  - 不要吞错；若捕获异常需给出最小可观测信息（UI 提示或日志）。
  - 对用户可见失败提供可理解文案，避免静默失败。

### 4.7 样式与 Tailwind

- Tailwind 作为主样式方案，类名直接写在模板上。
- 全局复用样式放在 `src/style.css` 的 `@layer components`。
- 主题采用 `darkMode: 'class'`，通过根容器 class 控制。
- 视觉风格偏 glassmorphism（`glass`、`glass-strong`、阴影工具类）。
- 修改样式时优先复用现有 tokens（`tailwind.config.js` 中 `colors/app/glass` 等）。

## 5. 类型策略

- 当前仓库为 JavaScript 项目，未配置 TypeScript 与类型检查脚本。
- 若新增复杂数据结构，优先在局部增加 JSDoc 类型注释而非大规模迁移。
- 不要引入 `any` 风格逃生策略（即使后续迁移 TS）。

## 6. 变更原则（给 agent）

- 小步提交：一次只改一个明确问题，避免“顺手大重构”。
- 遵循现有目录与命名，不随意迁移文件位置。
- 未被请求时，不要引入新依赖或新构建工具。
- 未被请求时，不要同时做功能变更和风格清洗。
- 修改窗口管理逻辑时，优先验证最小闭环：打开 / 聚焦 / 最小化 / 关闭。

## 7. 验证清单（每次改动后）

- 能运行：`npm run dev`
- 能构建：`npm run build`
- 可预览：`npm run preview`（如需要验收生产构建）
- 若仅改样式：至少检查桌面主界面、Dock、Window 三个区域未明显回归。

## 8. Cursor / Copilot / AGENTS 规则状态

- 未发现 `.cursor/rules/` 目录。
- 未发现 `.cursorrules` 文件。
- 未发现 `.github/copilot-instructions.md`。
- 根目录原先未发现 `AGENTS.md`，本文件为首次补充。

## 9. 规则优先级（发生冲突时）

1. 用户/任务中的即时指令。
2. 仓库内显式自动化约束（未来若添加 lint/test/CI 配置）。
3. 本文件（`AGENTS.md`）。
4. 社区通用最佳实践。

## 10. 后续建议（可选）

- 优先补齐质量脚本：`lint`、`test`、`test:one`。
- 建议引入 Vitest + Vue Test Utils，先覆盖 `desktop` store 核心行为。
- 若项目将长期演进，再评估迁移到 TypeScript。
