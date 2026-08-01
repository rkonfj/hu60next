# Repository Guidelines

## 项目结构与模块组织

本项目是基于 Next.js 16 和 React 19 的社区前端。路由、布局及服务端处理器位于 `app/`；API 端点遵循 App Router 结构，例如 `app/api/topics/route.ts`。可复用界面组件放在 `components/`，API 客户端、领域类型、格式化、内容清理等共享逻辑放在 `lib/`。静态资源与响应头配置位于 `public/`，构建及本地代理脚本位于 `scripts/`。`open-next.config.ts` 和 `wrangler.jsonc` 管理 Cloudflare 部署。`.next/`、`.open-next/`、`dist/` 均为生成目录，不应提交。

## 构建、测试与开发命令

- `npm ci`：按 `package-lock.json` 精确安装依赖，要求 Node.js 20.9 或更高版本。
- `npm run dev`：在 `http://127.0.0.1:3000` 启动开发服务器。
- `npm run typecheck`：执行严格的 TypeScript 类型检查，不生成文件。
- `npm run build:next`：仅生成 Next.js 生产构建。
- `npm run build`：构建 Next.js、打包 Cloudflare Worker，并准备 Sites 所需的 `dist/`。
- `npm run start`：在本地运行已完成的 Next.js 生产构建。

## 编码风格与命名约定

使用 TypeScript 和函数式 React 组件，力求简约、清晰、优雅：优先选择直接可读的实现，避免无必要的抽象、嵌套和重复。遵循现有格式：两个空格缩进、双引号、分号，并使用 `@/` 导入仓库内模块。组件文件采用 kebab-case（如 `topic-card.tsx`），导出组件使用 PascalCase，函数及变量使用 camelCase。路由专用逻辑应靠近对应的 `app/` 路由；可复用或数据处理逻辑应移入 `lib/`。保持严格类型，除非上游数据确实无法确定，否则不要使用 `any`。

## 测试指南

项目目前没有自动化测试框架或覆盖率门槛。提交前必须运行 `npm run typecheck` 和 `npm run build`。在桌面端与移动端宽度下手动检查受影响页面，并按需覆盖加载、空数据、错误及登录状态。修改 API 时，应验证成功与拒绝请求，确保公开错误不会泄露凭证或上游响应详情。

## 提交与 Pull Request 规范

提交消息统一使用简短、明确的中文摘要，例如 `增加三态主题切换`。使用动宾结构描述实际改动，避免含糊的“更新代码”或“修复问题”。每个提交只聚焦一种行为。PR 应说明用户可见变化、受影响路由、验证命令并关联相关 Issue。视觉改动需附前后对比截图；涉及配置或部署时须明确说明影响。

## 安全与配置

本地配置写入 `.env.local`。不得提交会话 ID、密码、Cloudflare Token 或部署凭证。修改 API 转发或 HTML 渲染时，必须保留现有的内容清理与公开错误边界。
