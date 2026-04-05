# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GmlHub 是一个模拟 macOS 风格桌面的 Web 应用（个人工作台），使用 Vue 3 + Vite + Pinia + Tailwind CSS 构建。

## Commands

```bash
npm run dev      # 启动开发服务器
npm run build    # 生产构建
npm run preview  # 预览构建产物
npm run test     # 运行测试（Vitest）
```

## Architecture

### Core State (Pinia)
- `src/stores/desktop.js` - 核心状态管理：窗口管理、主题切换、壁纸设置、应用注册
- 使用 setup store 风格：`defineStore('name', () => { ... })`

### Desktop Components
- `src/components/desktop/Desktop.vue` - 主桌面容器，管理壁纸和全局布局
- `src/components/desktop/Window.vue` - 窗口组件，支持拖拽、调整大小、最小化/最大化/关闭
- `src/components/desktop/Dock.vue` - 底部 Dock 栏
- `src/components/desktop/AppIcon.vue` - 桌面应用图标

### Entry Points
- `src/main.js` - 应用入口，挂载 Pinia 和全局样式
- `src/App.vue` - 根组件
- `src/style.css` - 全局样式，包含 Tailwind 扩展和 glassmorphism 组件

## Key Implementation Details

- 窗口 z-index 管理：通过 `zIndex` 和 `focused` 状态维护窗口层级
- 主题模式：`darkMode: 'class'`，通过根容器 class 控制
- 视觉风格：glassmorphism（`glass`、`glass-strong` 类）
- 组件通信：通过 Pinia store 共享状态

## Code Style

- Vue SFC 使用 `<script setup>`
- 缩进 2 空格，单引号，无分号
- Store 命名：`useXxxStore`
- 事件处理函数前缀：`handleXxx`、`startXxx`、`toggleXxx`

## See Also

详细的工作指南（包括变更原则、验证清单等）请参考 `AGENTS.md`。
