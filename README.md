# Hanboro Collections Website 2.0

本仓库沿用现有产品目录的设计和交互，使用 Cloudflare Workers Static Assets 发布。产品图片直接保存在 `dist/web-images/`，不需要创建 `public` 文件夹。

## Cloudflare 设置

| 项目 | 内容 |
| --- | --- |
| GitHub 仓库 | `potterzheng/Hanboro-collections-website2.0` |
| 生产分支 | `main` |
| Cloudflare 项目名称 | `hanboro-collections-website2-0` |
| 根目录 | 仓库根目录，即 package.json 所在位置 |
| 构建命令 | `npm run build` |
| 部署命令 | `npx wrangler deploy` |
| 公开文件目录 | `dist`，已在 wrangler.jsonc 中指定 |

提交到 main 后，已经连接的 Cloudflare GitHub 集成会触发新构建。构建和部署结果以 Cloudflare 后台为准。域名、账户授权和部署凭据不写进仓库；不需要在聊天或代码中填写密码、验证码、API Token。

## 文件分工

- `data/catalog.json`：产品、子型号、配色、参数和图片引用。
- `src/`：可继续修改的页面、样式及交互源码。
- `dist/web-images/`：需要保留并提交的网页图片和缩略图，继续按分类、型号、子型号归档。
- `dist/index.html`、`dist/_headers` 和 `dist/assets/`：Cloudflare 构建时根据源码和产品数据生成，不重复提交到 GitHub。
- `dist/.assetsignore`：防止内部图片备注等文件被当作网站资源发布。
- `wrangler.jsonc`：与现有 Cloudflare Worker 同名的静态网站发布配置。
- `scripts/`：构建、检查、本机预览和回归测试。

## 构建方式

构建首先核对全部图片，再生成网页。构建不会清空 dist，也不会删除或重命名产品图片。数据中的图片名与原目录仅相差追加的内容校验后缀时，构建会在确认对应文件确实存在后解析为实际路径；找不到文件时明确报错，不用其他颜色或包装图替代。

公开网页不发布图片备注、原始电脑路径和内部图片索引。G 盘原始产品资料与本仓库相互独立，构建不会访问 G 盘。

## 本机检查

安装依赖后执行：

```powershell
npm ci
npm run build
npm run check
npm test
npm run preview
```

使用预览程序打印的网址打开。部署前可以执行 `npx wrangler deploy --dry-run`，这一步不发布到线上。Wrangler 是项目内固定版本的开发依赖，不需要全局安装 cf。

## 更新产品与设计

1. 修改产品时更新 `data/catalog.json`，新图片按对应分类和型号放到 `dist/web-images/`；主图和缩略图路径都必须存在。
2. 修改页面外观或交互时编辑 `src/`，不要仅手工编辑生成后的 JavaScript。
3. 构建、检查后，提交源码、数据、新图片和配置。生成后的 HTML、JS、CSS 不需要提交，Cloudflare 会重新生成。当前采用 dist 保存图片的方式，因此不能把整个 dist 加回 .gitignore。
4. Cloudflare 从同一仓库分支构建并发布，客户继续访问同一个网址。

收藏红心、默认与价格排序、无货排除、无其他配色时仅显示主图、详情滑动切换配色和带图片的询价单导出继续保留。当前询价单导出不会自动发送给商家，接收询价和产品管理后台属于后续独立功能。

## 官方资料

- 自动构建：https://developers.cloudflare.com/workers/ci-cd/builds/
- 静态文件目录：https://developers.cloudflare.com/workers/static-assets/binding/
- 自有域名：https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
