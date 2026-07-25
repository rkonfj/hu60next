# 虎绿林 Next

虎绿林 Next 是基于 Next.js 16、React 19 和虎绿林 JSON API 构建的现代社区前端。项目支持响应式布局、暗黑模式、登录会话、主题与回复、收藏、用户主页、消息中心、聊天室、附件上传等功能。

## 技术栈

- Node.js 20.9 或更高版本
- npm
- Next.js 16
- React 19
- TypeScript
- OpenNext for Cloudflare
- Cloudflare Workers / Codex Sites

## 目录说明

```text
app/                       页面与服务端 API 路由
components/                通用界面组件
lib/                       虎绿林 API、类型及数据处理
public/                    静态资源和响应头配置
scripts/local-http-proxy.mjs
                           局域网调试代理
scripts/prepare-sites.mjs  Codex Sites 构建产物整理脚本
open-next.config.ts        OpenNext 配置
wrangler.jsonc             Cloudflare Workers 配置
.openai/hosting.json       Codex Sites 项目标识
```

## 安装依赖

克隆项目后进入项目目录：

```bash
npm ci
```

推荐使用 `npm ci`，它会严格按照 `package-lock.json` 安装依赖，适合开发机和 CI/CD 环境。

## 环境变量

项目默认使用以下虎绿林 API 地址：

```text
https://hu60.cn/q.php
```

一般不需要额外配置。如需接入代理或测试 API，可在项目根目录创建 `.env.local`：

```bash
HU60_API_BASE=https://hu60.cn/q.php
```

末尾的 `/` 会被自动移除。

不要在环境文件、源码、README 或 Git 提交中保存 `hu60_sid`、用户密码、Cloudflare API Token、Codex Sites 临时仓库令牌等敏感信息。

## 本地开发

仅在当前电脑访问：

```bash
npm run dev
```

浏览器打开：

```text
http://127.0.0.1:3000
```

### 局域网访问

监听所有网卡：

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

然后使用开发机的局域网地址访问，例如：

```text
http://192.168.3.99:3000
```

`next.config.ts` 当前允许 `192.168.3.99` 作为开发来源。如果开发机 IP 发生变化，需要同步修改 `allowedDevOrigins`。

### 局域网重定向诊断代理

如果反向代理环境出现重定向循环，可让 Next.js 监听 `3001`：

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

再打开另一个终端运行：

```bash
node scripts/local-http-proxy.mjs
```

代理会监听 `0.0.0.0:3000`，并把请求转发到 `127.0.0.1:3001`。该脚本仅用于本地诊断，不应作为正式生产服务器。

## 代码检查

提交或部署前运行：

```bash
npm run typecheck
```

项目当前没有独立的自动化测试脚本，因此至少需要保证类型检查和生产构建均通过。

## 生产构建

执行完整构建：

```bash
npm run build
```

该命令依次完成：

1. 生成 Next.js 生产构建；
2. 通过 OpenNext 生成 Cloudflare Worker；
3. 整理 Codex Sites 所需的 `dist/` 部署产物。

主要构建目录：

```text
.next/                     Next.js 构建结果
.open-next/worker.js       Cloudflare Worker 入口
.open-next/assets/         Cloudflare 静态资源
dist/server/index.js       Codex Sites Worker 入口
dist/assets/               Codex Sites 静态资源
```

这些目录均为构建产物，不应提交到 Git。

### 本地运行生产版

构建完成后可以使用 Next.js 生产服务器检查页面：

```bash
npm run start -- --hostname 0.0.0.0 --port 3000
```

也可以检查 Cloudflare Worker 版本：

```bash
npx wrangler dev
```

## 部署到 Cloudflare Workers

### 1. 登录 Cloudflare

```bash
npx wrangler login
```

在无人值守的 CI 环境中，应通过平台的加密变量提供 Cloudflare 凭证，不要把令牌写进仓库。

### 2. 检查配置

部署配置位于 `wrangler.jsonc`，重点包括：

- Worker 名称：`hulvlin-next`
- Worker 入口：`.open-next/worker.js`
- 静态资源：`.open-next/assets`
- 兼容标志：`nodejs_compat`
- 外部虎绿林 API 访问：`global_fetch_strictly_public`
- 自引用服务绑定：`WORKER_SELF_REFERENCE`

如修改 Worker 名称，需要同时调整 `services` 中的 `service`。

### 3. 构建并部署

```bash
npm ci
npm run typecheck
npm run build
npx wrangler deploy
```

部署成功后，Wrangler 会输出 Worker 的公网地址。

### 4. 查看日志

```bash
npx wrangler tail hulvlin-next
```

如果出现 Cloudflare `Error 1101`，优先检查 Worker 日志中的异常堆栈，并确认：

- 已使用当前代码重新执行 `npm run build`；
- `.open-next/worker.js` 存在；
- `wrangler.jsonc` 中的入口和兼容标志没有被删除；
- 部署时使用的是本次构建生成的文件。

## 通过 Codex Sites 发布

项目已通过 `.openai/hosting.json` 绑定现有 Codex Sites 项目。该文件中的 `project_id` 是站点标识，不要随意更改，也不要为同一站点重复创建项目。

当前生产地址：

```text
https://hulvlin-next.rkonfj.chatgpt.site
```

推荐发布流程：

1. 完成代码修改；
2. 运行 `npm run typecheck`；
3. 提交代码并推送当前提交；
4. 运行 `npm run build`；
5. 确认 `dist/server/index.js` 和 `dist/assets/` 存在；
6. 让 Codex 保存新的 Sites 版本；
7. 将已保存的版本发布到生产环境；
8. 等待部署状态变为成功，并检查 Worker 错误日志。

Codex Sites 要求保存版本时提供的提交 SHA、已推送的源码和构建归档来自同一个源码状态。不要修改构建产物后继续复用旧的提交 SHA。

## 登录与会话

- 登录表单通过本站 `/api/login` 使用 `POST` 请求提交；
- 服务端从虎绿林登录接口取得会话并验证；
- 浏览器只保存名为 `hulvlin_sid` 的 `HttpOnly` Cookie；
- HTTPS 环境会自动启用 Cookie 的 `Secure` 属性；
- 所有需要登录态的虎绿林 JSON API 请求应由服务端附带会话；
- 退出登录通过 `POST /api/logout` 清除本站 Cookie。

如果登录成功后页面仍显示未登录，请依次检查：

1. 浏览器是否接受 `hulvlin_sid` Cookie；
2. 访问域名是否在登录前后保持一致；
3. HTTP 与 HTTPS 是否被混用；
4. 代理是否正确传递 `Host`、`X-Forwarded-Host` 和 `X-Forwarded-Proto`；
5. `/api/session` 是否返回有效用户信息；
6. 虎绿林上游会话是否已经失效。

## 更新部署

日常更新建议执行：

```bash
npm ci
npm run typecheck
npm run build
npx wrangler deploy
```

部署前应检查 Git 工作区，避免把本地环境文件、会话信息或无关改动带入版本。
