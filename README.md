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
- **服务状态监控** - 以“可访问 / 不可达 / 待检查”表示网络可达性，不冒充业务健康检查
- **置顶 & 最近** - 常用应用快速访问
- **项目深链接** - 使用 `#/app/:id` 直接打开项目内容页
- **PWA** - 支持安装到桌面，并提供基础离线壳

### 🎯 应用入口

桌面和启动器按“内置工具 / 外部链接 / 个人信息”分组，Dock 用分隔线对应三组。IP 检测、终端和设置在工作台窗口中使用；Tools、知识库等外部链接在浏览器新标签页打开。分类依据已有的启动方式和个人信息插件，组内保留用户的图标排序、置顶和最近使用优先级。
- 工具集 (Tools)
- 知识库 (Wiki)
- 密码箱 (Vault)
- 博客
- GitHub
- 哔哩哔哩
- 剪贴板历史
- 终端
- IP 检测（公网 IPv4 / IPv6、归属地、ASN 与信誉参考）
- 设置
- 关于我
- 联系方式
- 回收站

### IP 检测

从桌面、Dock 或快捷启动器打开 **IP 检测**，会自动检测当前公网 IPv4 并查询详情。也可点击“检测当前 IPv4 / IPv6”重新检测，或输入一个 IP 后查询。支持复制 IP 与完整结果；结果包含归属地、运营商 / 组织、ASN、网段及第三方信誉与网络类型标记。

- 打开面板时自动请求当前 IPv4，后续也可手动查询；不保存查询地址或结果，桌面仍按原逻辑保存窗口位置。
- 出口检测使用 [ipify](https://www.ipify.org/)，详细信息使用 [Net.Coffee](https://ip.net.coffee/)。使用代理或分流时，出口仅代表访问检测服务所走的链路。IPv6 失败可能来自本地网络、代理、跨域限制或数据源，不能据此断言设备没有 IPv6。
- 缺失信誉分显示“—”，缺失标记显示“未知”；分数范围为 0–100，越高代表数据源认为信誉越好。归属地为估算，结果不证明匿名性或任何平台账号可用性。
- 接口连接、HTTP 错误、限流、超时和返回地址不匹配均有提示，可重试；若已取得出口 IP 而详情失败，仍保留出口结果。关闭窗口会取消在途请求。
- 此轻量面板参考 [one-ip](https://github.com/zhihui-hu/one-ip) 的公开功能与数据源选择，使用现有 Vue 插件结构独立编写。完整源码集成另见下方“one-ip 网络工具箱”及对应 AGPL 许可证声明。

轻量面板不包含 DNS/WebRTC、浏览器指纹、全球 Ping、测速和 AI 服务检测，这些功能在“网络工具箱”中使用。外部 API 不纳入 PWA 离线缓存。第三方接口可能限流或改变跨域策略；轻量面板无需 API Key。

### 工作区外壳与定制

- 设置中的“工作室 / 午夜”切换整套桌面、窗口、Dock 和应用图标的表面令牌；“舒适 / 紧凑”控制工作区信息密度。
- 主题和密度进入版本化桌面状态，刷新后保留；新增自定义能力应优先扩展 `src/config/settings.js`、Pinia setter 和对应主题令牌，避免在单个组件里写死颜色与间距。
- 可复用的视觉约束记录在 [design-system/gmlhub/MASTER.md](design-system/gmlhub/MASTER.md)。

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

## PWA 更新与离线访问

- `pnpm run build` 自动根据构建文件和 Worker 源码生成缓存版本，并将首页、静态文件及异步面板预缓存到 `dist/sw.js` 的清单中；网络工具模块包含构建时间，重新构建时也会生成新的缓存版本。
- 在线导航优先向服务器验证首页，断网时使用已安装版本的首页及资源。跨域网站和 API 不写入离线缓存。
- 新版本预缓存成功后显示“新版本已就绪”，用户可选择“刷新使用新版”或“稍后再说”。首次安装不提示更新，刷新不会清理桌面设置。
- 从旧的 `gmlhub-shell-v1` 迁移时自动接管 Worker，但不会强制刷新页面。仍运行旧代码的标签页会继续保留其资源；全部页面使用新版后才清理本应用的旧缓存，不删除其他应用缓存。
- 打开页面、回到前台或恢复网络时检查更新。安装失败保留现有版本，刷新激活超时会恢复重试按钮。

部署必须使用完整的 `dist/`，不要直接发布 `public/sw.js`（其中包含构建占位符）。服务器与 CDN 应让 `/index.html`、`/` 和 `/sw.js` 及时重新验证，带内容 hash 的 `/assets/` 文件可长期缓存。

回归检查：`pnpm run test:run`，覆盖 Worker 生命周期、离线回退、跨标签资源保留及更新提示交互。

CI/CD 工作流、首次接入和回滚说明见 [deploy/README.md](deploy/README.md)。

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
│   └── desktop.js       # 桌面状态管理与窗口边界
├── apps/
│   └── registry.js       # 可扩展应用插件注册表
├── config/
│   ├── apps.js           # 应用 manifest
│   └── settings.js       # 默认设置与校验
├── services/
│   ├── deepLinks.js      # 项目深链接
│   └── persistence.js    # 版本化本地持久化与旧键迁移
├── App.vue              # 根组件
└── main.js              # 入口文件
```

## one-ip 网络工具箱

内置工具区新增 **网络工具箱**，包含固定版本 one-ip 的全部页面及 Worker 后端：IP、全球 Ping、测速、DNS / CDN、WHOIS、子域名、浏览器指纹/环境/隐私检测、AI 可用性、服务状态，以及主题、语言、分享和 WebMCP。

运行 `pnpm run dev` 会同时启动桌面、网络模块和后端。首次安装若使用了 `--ignore-scripts`，请先运行 `pnpm run setup:one-ip`。配置条件、功能清单、测试命令及生产后端要求见 [docs/one-ip.md](docs/one-ip.md)。

全球 Ping 和人机验证需自有密钥；本地无法获得真实 Cloudflare 访客 IP/TLS 元数据。生产工作流先部署并验证 Cloudflare Worker，再发布宝塔桌面；需要在 GitHub 的 `production` 环境配置 Cloudflare 部署凭据。是否完成上线以实际 Actions 和公网验收为准。

## 许可证

GmlHub 原有自有代码为 MIT；集成的 one-ip 模块为 **AGPL-3.0-only**，不适用原有 MIT 声明。保留的许可证和第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。构建提供包含本地修改的源码归档 `/one-ip/source.tar.gz`。
