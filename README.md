# Personal OS - 个人工作台

一个模拟 macOS 风格桌面体验的 Web 应用，为您提供高效的个人工作空间。

![Vue 3](https://img.shields.io/badge/Vue-3.5+-42b883?style=flat&logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-7+-646CFF?style=flat&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-06B6D4?style=flat&logo=tailwind-css)
![Pinia](https://img.shields.io/badge/Pinia-3+-FFD859?style=flat)

## 功能特性

### 🎨 视觉体验
- **动态壁纸** - 支持多种风格切换（深网、霓虹、量子、信号）
- **开机动画** - 流畅的开机启动序列
- **赛博朋克特效** - 网格扫描、代码雨、粒子脉冲等动态效果
- **玻璃拟态 UI** - 现代毛玻璃设计风格

### 🖥️ 桌面交互
- **窗口管理** - 拖拽、调整大小、最小化、最大化和关闭
- **Dock 栏** - 快捷访问常用应用
- **应用图标拖拽** - 桌面图标自由排列组合
- **右键菜单** - 快速操作入口

### ⚡ 效率工具
- **快捷启动器** - 按 `Ctrl+K` 快速搜索和启动应用
- **服务状态监控** - 实时监测在线服务状态
- **置顶 & 最近** - 常用应用快速访问

### 🎯 内置应用
- 工具集 (Tools)
- 知识库 (Wiki)
- 密码箱 (Vault)
- 博客
- GitHub
- 哔哩哔哩
- 剪贴板历史
- 终端
- 设置
- 关于我
- 联系方式
- 回收站

## 技术栈

- **Vue 3** - 渐进式前端框架
- **Vite** - 下一代构建工具
- **Pinia** - 轻量级状态管理
- **Tailwind CSS** - 实用优先的 CSS 框架

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev

# 生产构建
pnpm run build

# 预览构建产物
pnpm run preview
```

## 项目结构

```
src/
├── components/desktop/   # 桌面组件
│   ├── Desktop.vue       # 主桌面容器
│   ├── Window.vue        # 窗口组件
│   ├── Dock.vue         # Dock 栏
│   ├── AppIcon.vue      # 应用图标
│   ├── ContextMenu.vue  # 右键菜单
│   └── ...
├── stores/
│   └── desktop.js       # 桌面状态管理
├── App.vue              # 根组件
└── main.js              # 入口文件
```

## 许可证

MIT License
