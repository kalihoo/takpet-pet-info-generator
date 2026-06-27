# TakPet 宠物信息自动化生成

轻量 Node.js MVP：输入犬种，生成结构化宠物科普内容，用固定 HTML/CSS 模板导出 TakPet 风格海报。

## 本地运行

```bash
npm install
npm test
npm run generate -- --breed 西高地白梗
npm start
```

Web 页面默认运行在：

```text
http://localhost:3000
```

输出文件在：

```text
outputs/<犬种>/content.json
outputs/<犬种>/poster.html
outputs/<犬种>/poster.png
```

在 Vercel 上运行时，本地输出目录会自动切到 `/tmp/takpet-outputs`，并可上传到 Supabase Storage 生成长期可访问 URL。

## 免费优先策略

默认配置：

```env
AI_PROVIDER=free-first
TEXT_PROVIDER=gemini
SEARCH_PROVIDER=gemini
IMAGE_PROVIDER=none
PAID_API_ENABLED=false
```

这意味着项目会优先使用 Gemini API 的免费文本与检索能力，但默认不调用已知会产生费用的图片生成接口。只有显式设置 `PAID_API_ENABLED=true`，才允许 OpenAI 或 Gemini 图片生成这类付费 API。

## 内容生成模式

- 设置 `GEMINI_API_KEY` 时优先调用 Gemini Interactions API，并启用 `google_search` 做在线资料检索。
- `PAID_API_ENABLED=true` 且设置 `OPENAI_API_KEY` 时，才允许调用 OpenAI Responses API。
- API 调用失败时，自动使用本地模板兜底。
- 第一版只支持犬种，其他宠物类型留作后续优化。

## 图片生成模式

- 默认 `IMAGE_PROVIDER=none`，不自动调用 AI 生图，避免批量生成时产生费用。
- 需要 AI 生图时，可设置 `PAID_API_ENABLED=true` 并将 `IMAGE_PROVIDER` 设为 `gemini` 或 `openai`。
- Gemini 图片默认模型：`GEMINI_IMAGE_MODEL=gemini-3.1-flash-image`；也可改为 `gemini-2.5-flash-image`。
- 图片只作为海报素材进入 HTML 模板，不让图像模型直接绘制中文排版。
- 图片生成失败或关闭时，模板显示犬种图片占位，不会把 TakPet logo 当作犬种图重复使用。

## Seedance 2.0 研究结论

Seedance 2.0 主要是视频生成模型，不是这个项目当前需要的静态犬种图片主链路。公开 API 多通过第三方平台按秒计费，部分平台有试用 credits，但不适合作为稳定、合规、长期免费的批量图片生产方案。当前项目不自动接入 Seedance 2.0；如后续要做宠物短视频，可以新增独立 provider。

## Logo 锁定

把官方 TakPet logo 放到：

```text
assets/logo.png
```

模板固定引用这个路径，不通过 AI 生成或重绘 Logo。

当前项目已经固定写入商业 Logo：`assets/logo.png`。

## Vercel 免费部署 + Supabase Storage

Vercel 不直接运行 Docker 镜像；本项目在 Vercel 上走 Node.js Runtime，在 VPS 上仍可用 Docker Compose。

### 1. Supabase Storage 设置

在 Supabase 新建项目后，推荐创建公开 bucket：

```text
takpet-posters
```

也可以不手动创建，让服务端使用 `SUPABASE_SERVICE_ROLE_KEY` 首次生成时自动创建 bucket。

### 2. Vercel 环境变量

在 Vercel Project Settings -> Environment Variables 添加：

```env
AI_PROVIDER=free-first
TEXT_PROVIDER=gemini
SEARCH_PROVIDER=gemini
IMAGE_PROVIDER=none
PAID_API_ENABLED=false
GEMINI_API_KEY=你的 Gemini key
GEMINI_TEXT_MODEL=gemini-2.5-flash
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service role 或 secret key
SUPABASE_STORAGE_BUCKET=takpet-posters
SUPABASE_STORAGE_PREFIX=posters
SUPABASE_STORAGE_PUBLIC=true
SUPABASE_STORAGE_ENSURE_BUCKET=true
```

`SUPABASE_SERVICE_ROLE_KEY` 只能放在 Vercel 服务端环境变量里，不能写入前端代码，也不要提交到 Git。

### 3. 部署

把 GitHub 仓库导入 Vercel，Framework 选择 `Other`，保持默认安装流程即可。`vercel.json` 已将 `src/server.js` 函数时长设置为 60 秒，适合 Gemini 请求加 Playwright 截图。

生成后 API 会返回 Supabase Storage 的 `png/html/json` URL，文件不会依赖 Vercel 的临时目录。

## Docker 部署

```bash
cp .env.example .env
docker compose up --build -d
```

VPS 上可以继续把 `outputs` 目录作为持久化目录保留；如果配置了 Supabase 环境变量，也会同步上传到 Supabase Storage。
