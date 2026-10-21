# one-ip 完整集成

来源：<https://github.com/zhihui-hu/one-ip>，固定版本 `8dff832f7af9be9f3c812402dd680395ec081c0c`。模块源码与原许可证在 `modules/one-ip/`，实际修改版源码随生产构建提供下载。

## 功能与入口

桌面 → **内置工具 → 网络工具箱**。应用内运行本地同源源码，独立入口 `/one-ip/`；原有轻量 **IP 检测** 保留。

| 功能 | 路径（均位于 `/one-ip` 下） | 条件与结果边界 |
| --- | --- | --- |
| 总览、国内外出口、网站分流、归属地与信誉 | `/` | 数据来源和探测站点须可达 |
| IPv4 / IPv6、ASN、CIDR、RDAP、多源地理位置、风险、地图、场景诊断 | `/network/ip` | 第三方可能限流或部分失败，地图默认 OpenStreetMap |
| 全球 Ping、地区节点、丢包与延迟 | `/network/ping` | 必须配置 Turnstile，保留上游验证保护 |
| Cloudflare / OpenSpeedTest 测速、延迟、下载与上传 | `/network/speedtest` | 用户点击后开始，会消耗实际带宽；AIM 星级额外需要临时 TURN 凭据服务 |
| 网站连通性、多轮 HTTP 延迟、出口对比 | `/network/connectivity` | 浏览器直接发起，保留 CORS/网络失败反馈，不用服务器结果冒充本机网络 |
| DNS 出口 / CDN 节点与缓存信息 | `/network/dns`、`/network/cdn` | 依赖各检测服务可达 |
| WHOIS（域名、IP、ASN）与子域名 | `/network/whois`、`/network/subdomains` | RDAP / crt.sh / HackerTarget 等上游可能限流 |
| 环境、FingerprintJS、CreepJS、一致性、自动化、隐私和 WebRTC | `/browser/*` | 权限由用户操作；Cloudflare JA3 / JA4 取决于真实边缘元数据及账户能力，本地不伪造 |
| Turnstile / 非交互 Turnstile / reCAPTCHA v3 | `/browser/challenges` | 需各自的站点/服务端密钥与允许域名；未配置明确提示 |
| GPT、Claude、Grok、Perplexity、Gemini、DeepSeek、Qwen、Kimi | `/ai/*` | 只表示检测时浏览器可见的网络结果，不代表账号授权 |
| 官方状态聚合、事件、维护与组件状态 | `/status`、`/status/openai`、`/status/claude` | 状态源可能无公开数据或暂时失败 |
| 公开 IP 健康接口 | `/api/ip/health?ip=1.1.1.1` | 实际地址为 `/one-ip/api/ip/health`；省略 IP 的本地请求明确返回 503 |
| 中英文、明暗主题、查询历史、复制、二维码/分享、WebMCP | 以上页面 | WebMCP 仅在浏览器支持 `document.modelContext` 时注册，不承诺所有浏览器可用 |

## 本地运行

需要 Node.js ≥24 和 pnpm。根目录 `pnpm install --frozen-lockfile` 会通过本项目的 postinstall 安装模块依赖，模块安装禁用上游生命周期脚本。若用了 `--ignore-scripts`，另运行 `pnpm run setup:one-ip`。

```sh
pnpm run dev
```

该命令管理三个本地进程：GmlHub Vite（5173）、one-ip Vite（5137）及 Worker 运行时（8787），均只监听 127.0.0.1。任一退出则停止同次启动的其他进程；Ctrl+C 统一退出，5 秒后清理未响应进程。代理保持原 Origin，API 只接受同源调用，保留上游请求限流、参数校验和挑战验证。

浏览器访问 `http://127.0.0.1:5173/`。不要用单独的 `vite` 启动替代完整命令，否则网络工具后端不会启动。

可选密钥：复制 `server/.dev.vars.example` 为 **`server/.dev.vars`**，填写后重启。该文件被 Git 忽略；不要在聊天中发送密钥，也不要放进 `VITE_*`。两套开发服务器均禁止通过源码路径或 `/@fs` 读取 `.dev.vars*` / `.secrets*` 文件。只配置自己的站点域名。生产在 Cloudflare Worker 的变量/Secrets 中配置同名字段，不上传本地文件。

可选地图：`TIANDITU_TOKEN`；未配置时使用 OSM。可选测速 AIM 配置参考 `modules/one-ip/docs/config/network-quality.env.example`，仅短期 TURN 凭据接口可用于浏览器。带长期凭据的变量不可公开。

## 构建、测试与部署边界

```sh
pnpm run build
pnpm run test:run
pnpm run test:one-ip
pnpm run worker:check
```

构建先做 one-ip TypeScript 检查，再生成两套前端；`dist/one-ip/` 包含子应用和实际修改版源码归档，**不包含可直接访问的后端源目录**。GmlHub Service Worker 不预缓存网络诊断模块、不接管其 API 或导航，避免离线时返回错误的桌面页面。诊断结果仍按上游策略保留必要的查询历史，隐私页有说明；轻量 IP 检测不保存查询结果。

静态产物预览：先另开终端运行 `pnpm run worker:dev`，再 `pnpm run preview`。网络模块的 API 仍需要后端。

生产采用宝塔 + Cloudflare Workers：桌面仍由宝塔托管，`wrangler.toml` 仅让 `gmlhub.top/one-ip` 和 `gmlhub.top/one-ip/*` 交给 `gmlhub-one-ip` Worker，后者提供模块静态资源、子页面回退和 API。域名必须保持 Cloudflare 代理开启。直接访问模块请使用带斜杠的 `/one-ip/`；Cloudflare 精确路径路由不会匹配无尾斜杠且带查询参数的 `/one-ip?…`。不把 VPS 出口或浏览器自报 Header 当作真实访客 IP/TLS 指纹。

CI 在不持有生产凭据的 verify job 中构建并测试两套前端和 Worker；deploy job 下载同一次运行的已验证产物，先部署 Worker 并核对提交号、真实公开 IP 查询、首页、深层页面与入口脚本，再发布宝塔桌面。`pnpm run worker:check` 只做本地打包，**不会发布**。生产 Secrets、重试和跨平台回滚边界见 [部署说明](../deploy/README.md)。凭据未配置或发布检查失败时，不会继续发布桌面；本地通过不等于生产已上线。

网络模块静态响应追加 `Cache-Control: no-transform` 并保留原缓存规则，避免 Cloudflare 自动注入统计脚本改变页面字节及指纹环境；不修改域名的全局统计或安全设置。[Cloudflare 说明](https://developers.cloudflare.com/web-analytics/faq/)

## 集成决策

保留完整上游 React/Worker 模块，Vue 通过本地 iframe 接入，使 React/Tailwind 4 与现有 Vue/Tailwind 3 隔离；无需将所有网络诊断重写为 Vue。所有业务探测保持上游实现。上游禁止跨站嵌入的策略在自己的本地副本收敛为 **仅允许同源嵌入**，没有使用在线站点 iframe。

适配 BrowserRouter basename、静态图标、CreepJS 脚本、分享 URL、API 文档、API 挂载路径和源码下载。上游 `/worker` 源码访问阻断仍保留；开发代理额外阻断 `/one-ip/worker`。

进程管理借鉴 CodeVault `supervised-task-process-lifecycle` 的退出联动、限时终止约束，采用 Node 子进程组适配，未引入其 Python 抽象。当前开发脚本以 macOS/Linux 为验收目标，Windows 子孙进程强制清理尚未验收。

升级时核对 `UPSTREAM.json`、路径适配、本地补丁、许可证、全量上游测试和真实浏览器。运行证据另见 `outputs/one-ip-2026-10-20/`，不要把固定版本测试结果视为后续版本保证。
