# TakPet MVP Todo

## 当前已实现工作

- [x] 初始化 Node.js 单仓库项目与 npm scripts。
- [x] 实现犬种内容生成双模式：Gemini 免费优先，本地模板兜底，OpenAI 仅在付费开关打开时使用。
- [x] 实现固定 HTML/CSS 海报模板，锁定 `assets/logo.png`。
- [x] 实现 Playwright 1080x1440 PNG 截图导出。
- [x] 固定商业 TakPet logo 到 `assets/logo.png`。
- [x] 接入 Responses API `web_search` 在线检索，作为付费后备。
- [x] 接入 OpenAI Image API 生成犬种照片素材，默认关闭。
- [x] 将海报模板升级为图文信息图排版。
- [x] 增加 Gemini 免费优先 provider。
- [x] 增加 `PAID_API_ENABLED=false` 付费 API 硬开关。
- [x] 配置 Gemini Google Search grounding。
- [x] 配置 Gemini Nano Banana 图片生成，默认关闭以避免产生费用。
- [x] 图片生成不可用时渲染犬种图片占位，不再复用 TakPet logo。
- [x] 增加 Vercel 运行时 `/tmp` 输出目录适配。
- [x] 接入 Supabase Storage，用于长期保存 `poster.png`、`poster.html`、`content.json`。
- [x] 增加 Vercel Serverless Chromium 启动路径，提升 Playwright 截图在 Vercel 上的可运行性。
- [x] 记录 Seedance 2.0 不适合作为静态图主链路的研究结论。
- [x] 实现 Express Web 页面与 `POST /api/generate`。
- [x] 实现 CLI：`npm run generate -- --breed 西高地白梗`。
- [x] 添加 Dockerfile、Compose、`.env.example` 和部署说明。
- [x] 添加基础测试：内容结构、模板渲染、API、CLI。
- [x] 升级为 Content Pack v2：支持犬、猫、异宠。
- [x] 新增故事线、新手避坑、用品推荐、环境/栖息地、片单灵感、小红书标题正文标签。
- [x] 新增 `copy.md` 文案导出，并同步上传 Supabase Storage。
- [x] 前端升级为轻量内容工作台，支持物种、栏目和风格选择。

## 后续优化

- [ ] 批量输入 50/100 个犬种，自动生成图包。
- [ ] 增加不同海报主题模板和封面 A/B 样式。
- [ ] 增加 Web 页面中的历史记录和下载入口。
- [ ] 增加 Supabase 数据表，记录每次生成的 breed、source、storage path 和创建时间。
- [ ] 增加定时任务，用于 VPS 每日自动生成内容。
- [ ] 增加 Nginx/Caddy 反向代理和 HTTPS 部署示例。
- [ ] 增加真实 TakPet 品牌字体、色板、Logo 多尺寸资产。
- [ ] 增加图片素材位：真实宠物照片上传或外部图库接入。
- [ ] 增加内容审核规则，避免医疗/饲养建议过度绝对化。
- [ ] 接入合法公开图库或用户上传素材，替代默认占位图。
