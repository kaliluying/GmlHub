# GmlHub CI/CD

范围仅为 `kaliluying/GmlHub` 与 `gmlhub.top`，不部署 Tools、Wiki、博客或密码箱。

## 每次发布

1. PR 运行项目与 one-ip 回归、部署脚本测试、两套前端构建和 Worker 打包，不使用生产凭据。
2. 合并/推送到 `main` 后，同一工作流的 deploy job 下载刚验证的静态构建包和 Worker bundle，不在 VPS 安装 Node 或重新构建。先读取部署前桌面和 Worker 的公开提交号，在最近 10 个 Worker 版本中按**桌面 SHA** 选择最新匹配的版本，核对版本 ID、tag 及版本内 `RELEASE_SHA`，将恢复目标落盘为 Runner 上的 `worker-recovery.json`；配置、版本查询、校验或快照失败均不部署。再部署 `gmlhub-one-ip` Worker，仅接管 `gmlhub.top/one-ip` 和 `/one-ip/*`；必过检查为提交号 SHA、配置 API、模块首页、深层页面及入口脚本字节，通过后才发布桌面。第三方 IP 健康查询通过显式上游诊断单独检查，不作为发布必过门禁。Cloudflare 域名代理须保持开启；不需要在宝塔添加 API 代理。
3. 如果 main 已有更新提交，过时的 deploy job 跳过；生产发布使用独立 concurrency group，进行中的发布不被新提交取消。[GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
4. SSH 使用专用账号及服务器固定主机密钥，构建包经 stdin 传给 forced command。服务器验证命令、包 SHA-256、gzip 完整性、文件清单及校验和，拒绝穿越、链接、重复条目和超量内容。
5. 完整版本存放到 `releases/<commit>/public`，再原子切换 `current`。源站逐个读取版本文件、首页、Service Worker 和静态资源，验证返回字节；失败或可捕获的终止信号会恢复宝塔原指针。
6. Runner 再从公网检查 `/version.json` 的 commit 和 one-ip Worker、资源。公网/CDN 检查失败会使 Actions 标红，不能宣称已验收；源站已切换的版本不会仅因 CDN 异常而自动回滚。
7. 最后一次双端一致性检查通过后，单独运行 `python3 scripts/check_one_ip_release.py "$GITHUB_SHA" dist --upstream` 诊断第三方 IP 声誉服务。失败时输出 Actions warning 并使该诊断步骤以非零状态退出；该步骤设有 `continue-on-error: true`，不阻塞已完成的桌面发布，也不触发 Worker 回退。降级数据（如 `source=ipwho.is`、`status=unknown`）不能冒充 IP 声誉服务正常。

同一个 commit 的相同构建包可安全重试；同一个 commit 的不同内容会被拒绝。打包器固定归档元数据，避免单纯重试产生不同包。版本清单中的 SHA 来自 GitHub 的实际提交；本地未提交演练使用基线 SHA，仅作为测试标签，不代表该提交已含工作区改动。

## 首次接入（管理员执行）

本节属于生产变更，须先取得提交、推送、部署、部署凭据及账号配置授权。

- 备份当前站点 `/www/wwwroot/gmlhub.top`、Nginx 主配置、rewrite 文件及证书验证目录；保留原站点目录以便恢复。
- 创建无密码的专用 `gmlhub-deploy` 用户，home 为 `/var/lib/gmlhub-deploy`。仅让其写入 `/www/wwwroot/gmlhub-cicd`；不授予 sudo，不复用 root 密钥。
- 把 `scripts/deploy_release.py` 安装为 root 所有、部署用户不可写的 `/usr/local/lib/gmlhub-deploy/deploy_release.py`。
- 为本项目生成独立 Ed25519 密钥。服务器公钥授权使用：`restrict,command="/usr/bin/python3 /usr/local/lib/gmlhub-deploy/deploy_release.py"`，然后跟公钥类型和内容；不允许交互 shell、SCP、端口/agent 转发或 PTY。`.ssh/authorized_keys` 由管理员维护。
- home、`.ssh` 与 `authorized_keys` 均由 root 维护且允许部署用户读取/遍历，权限分别为 0755/0755/0644；home 也不可由部署用户写入，防止通过替换 `.ssh` 目录改写授权。应用完整性校验忽略根目录由宝塔生成且禁止公网访问的 `.user.ini`、`.htaccess`，它们不属于构建包，归档仍禁止所有隐藏文件。
- 建立下述目录。将旧站点的 `.well-known` 内容复制到共享目录，并保留旧位置；每个发布版本由接收脚本添加 `.well-known` 指向共享目录的链接。
- 从当前生产站点的公开静态文件制作 legacy 快照，不复制 `.user.ini` 等管理文件。用 40 个 `0` 标记该历史快照；在改动宝塔 root 前把 `current` 指向该完整快照，记录它不是 Git 提交。
- 通过宝塔 `HtmlProjectModify(change_path)` 将站点根目录改为 `/www/wwwroot/gmlhub-cicd/current`；将本目录 `nginx.conf` 合并到项目的 rewrite 文件，不覆盖既有无关规则。`nginx -t` 成功后重载 Nginx，并先验证 legacy 快照、`.well-known` 和缓存头。
- 通过现有可信 SSH 连接核对服务器主机公钥，不使用未经核验的网络 keyscan 结果作为信任来源。
- 在仓库的 `production` Environment 添加以下 Secrets，然后提交推送本次 PWA 与 CI/CD 改动，观察 Actions 到部署完成。私钥只经安全 stdin 写入 Secrets，不写入仓库、报告或终端输出。[GitHub Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)

| Secret | 用途 |
|---|---|
| `DEPLOY_HOST` | 实际 VPS SSH 主机 |
| `DEPLOY_PORT` | 实际 SSH 端口 |
| `DEPLOY_USER` | 固定为 `gmlhub-deploy` |
| `DEPLOY_SSH_KEY` | 本项目的独立部署私钥 |
| `DEPLOY_KNOWN_HOSTS` | 已核验的 SSH 主机密钥行，非标准端口包含 `[host]:port` |
| `CLOUDFLARE_API_TOKEN` | Edit Cloudflare Workers 模板 Token，账户限定到目标账户、Zone 限定为 `gmlhub.top`，保留 Worker Scripts / Routes 等模板必需权限 |
| `CLOUDFLARE_ACCOUNT_ID` | 管理 `gmlhub.top` 的 Cloudflare Account ID，32 位十六进制；不是 Zone ID |

Cloudflare Token 在 [API Tokens](https://dash.cloudflare.com/profile/api-tokens) 创建，按 [官方 GitHub Actions 说明](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) 配置。缺少这两项时，CI 在改变 Worker 和宝塔之前失败。可选 Turnstile、reCAPTCHA、地图等密钥另在 Worker 的 Variables / Secrets 中配置，名称见 `server/.dev.vars.example`；CI 使用 `--keep-vars` 保留这些配置，不将本地 `.dev.vars` 上传。

目录布局：

```text
/www/wwwroot/gmlhub-cicd/
├── current -> releases/<commit>/public
├── releases/<commit>/
│   ├── archive.sha256
│   └── public/                 # 包内文件 + .well-known 链接
├── shared/assets/              # 各版本 hash 资源，仅追加
├── shared/well-known/          # 证书验证目录
└── deploy.lock
```

为保证旧标签和回滚可用，目前不自动删除历史版本和 hash 资源；文件量增长后由管理员按实际保留策略清理。接收脚本升级同样由管理员执行，CI 不允许自行替换服务器的受信任命令。

## 手动发布与回滚

在 GitHub → Actions → **GmlHub CI and deployment** → **Run workflow**：

- 分支固定选 `main`，`operation=deploy`：重跑 main 的测试、构建和发布。
- `operation=rollback`：`release_sha` 填已在两端成功发布的完整 40 位 SHA；在最近 10 个 Worker 版本中按 SHA tag 选择最新匹配的版本 ID（同 SHA 重试可能产生多个版本），恢复代码与资源并核对线上提交号，再验证宝塔已安装文件、切换并检查源站及公网。没有对应版本时会停止，不继续切换桌面；更旧版本须由管理员核对 Cloudflare 保留的版本 ID 后操作。

自动发布的 Worker 部署或紧随其后的必过检查（SHA、配置、资源字节）失败时，`scripts/deploy_worker_release.py` 会尝试将快照中的旧 Worker 版本部署到 100% 流量，再核对当前版本 ID、流量比例、公网 Worker 提交号与未变更的桌面提交号。恢复验证通过后，Actions **仍然失败**，后续桌面发布不执行；恢复命令失败或验证不符时明确报告 `Worker recovery FAILED; consistency is NOT verified`，不能视为两端一致。如果恢复前发现桌面已变更，则拒绝自动恢复，避免盲目回退已推进的发布。上游独立诊断失败不会触发此自动恢复；旧 Worker 的外部查询服务也可能仍不可用，恢复验证不能证明上游健康已修复。

恢复目标优先与部署前桌面对齐，而非照搬部署前已不一致的 Worker。例如桌面为 `0fe2516…`、Worker 为 `716f1d0…` 时，选择完整桌面 SHA 对应的 Worker；快照及日志记录已有不一致和选择依据。若对应 Worker 已不在最近 10 个可部署版本中，或 tag、`RELEASE_SHA` 无法验证，自动发布停止，需要管理员先核对恢复目标。首次接入没有历史 Worker tag 的站点（包括全 `0` legacy 快照）同样不能通过此门禁，须由管理员安排有明确恢复方案的首次部署。

Worker 与宝塔不构成跨平台原子事务。本轮自动恢复仅覆盖 **Worker 部署及紧随必过检查**，不覆盖后续 SSH 发布、源站或 CDN 验证、最终双端复查，也不改变手动 `operation=rollback` 的既有行为。桌面已成功切换而公网检查失败时，不自动回退 Worker；宝塔自身恢复旧指针时，Worker 也不会自动恢复。此时 Actions 标红，核对两端当前 SHA 后重试 `deploy`，或对两端都有的已知成功 SHA 执行 `rollback`。Runner 被终止、SIGKILL、失联或外部人工并发发布不能保证自动恢复；快照位于当前 Runner 工作目录，不是跨 Runner 的持久恢复记录。如需仅恢复旧桌面，管理员可使用原有受限 SSH `rollback <SHA>`，并另外处理 Cloudflare 路由。Worker 回滚不恢复路由、限流配置或独立管理的 Secrets，详见 [Cloudflare 回滚边界](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)。

若尚未发布到 Actions，不能把本地检查描述为真实 CI/CD 通过。

## 本地检查

```bash
pnpm run test:run
python3 -m unittest discover -s scripts -p 'test_*.py' -v
pnpm run build
pnpm run test:one-ip
pnpm run worker:check
bash -n scripts/deploy.sh
```

部署回归会在临时目录和本机隔离 HTTP 服务演练版本切换/回滚，以及 API 类型、版本和资源字节错误；Worker 发布使用模拟 pnpm/Wrangler CLI，覆盖恢复目标预检、快照失败、必过检查失败后的恢复及恢复验证失败，不连接 Cloudflare/VPS，不读取生产凭据。

## 验证边界

压缩包上限 32 MiB，解包文件总量上限 128 MiB，最多 1000 个文件；源站检查总预算 90 秒。硬断电、SIGKILL 或磁盘故障不能保证执行异常回滚，恢复后应核对 current、Worker 与版本清单。流程不包含数据库迁移或其他 VPS 服务的重启。

部署采用 CodeVault 的“暂存完整版本后激活”原则，复用浏览器/Vite 的 hash 资源，不引入数据库注册表或容器调度。
