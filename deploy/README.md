# GmlHub CI/CD

范围仅为 `kaliluying/GmlHub` 与 `gmlhub.top`，不部署 Tools、Wiki、博客或密码箱。

## 每次发布

1. PR 运行 31 项前端回归、部署脚本测试、Vite 构建和构建包生成，不使用生产凭据。
2. 合并/推送到 `main` 后，同一工作流的 deploy job 下载刚验证的构建包，不在 VPS 安装 Node 或重新构建。
3. 如果 main 已有更新提交，过时的 deploy job 跳过；生产发布使用独立 concurrency group，进行中的发布不被新提交取消。[GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
4. SSH 使用专用账号及服务器固定主机密钥，构建包经 stdin 传给 forced command。服务器验证命令、包 SHA-256、gzip 完整性、文件清单及校验和，拒绝穿越、链接、重复条目和超量内容。
5. 完整版本存放到 `releases/<commit>/public`，再原子切换 `current`。源站逐个读取版本文件、首页、Worker 和静态资源，验证返回字节；失败或可捕获的终止信号会恢复原指针。
6. Runner 再从公网检查 `/version.json` 的 commit。公网/CDN 检查失败会使 Actions 标红，不能宣称已验收；源站已切换的版本不会仅因 CDN 异常而自动回滚。

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
- `operation=rollback`：`release_sha` 填已安装版本的完整 40 位 SHA；不重新构建，先验证已安装文件，再切换并检查源站及公网。初次接入前快照使用 40 个 `0`。

若尚未发布到 Actions，不能把本地检查描述为真实 CI/CD 通过。

## 本地检查

```bash
pnpm run test:run
python3 -m unittest discover -s scripts -p 'test_*.py' -v
pnpm run build
bash -n scripts/deploy.sh
```

部署回归会在临时目录和本机隔离 HTTP 服务演练版本切换/回滚，不连接 VPS，不读取生产凭据。工作流另外使用 actionlint 检查。

## 验证边界

压缩包上限 32 MiB，解包文件总量上限 128 MiB，最多 1000 个文件；源站检查总预算 90 秒。硬断电、SIGKILL 或磁盘故障不能保证执行异常回滚，恢复后应核对 current 与版本清单。现有 Vue 应用是静态站点，流程不包含数据库迁移或其他服务的重启。

部署采用 CodeVault 的“暂存完整版本后激活”原则，复用浏览器/Vite 的 hash 资源，不引入数据库注册表或容器调度。
