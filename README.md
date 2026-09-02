# harbit_record

个人习惯打卡。Vue 3 + Tailwind + Cloudflare Pages Functions + D1。

正式环境用 Token 登录，会话 Cookie 有效 30 天。不要把 Token 写进仓库。

## 本地预览

```bash
npm install
npm run dev
```

开发模式任意非空 Token 即可进入，数据在浏览器 `localStorage`。

## 部署到 Cloudflare Pages

### 1. 准备 Token

在密码管理器里生成一串很长的随机字符，保存为 `SECRET_ACCESS_TOKEN`。
这是登录口令，只存在 Bitwarden 和 Cloudflare 环境变量里。

### 2. 创建 D1 数据库

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **D1 SQL Database** → **Create**。
2. 名称填 `habits`（可改，但下面绑定名必须是 `DB`）。
3. 进入该数据库 → **Console**，把 `schema.sql` 全文贴进去执行。

也可以在本机（需已登录 wrangler）执行：

```bash
npx wrangler d1 create habits
npx wrangler d1 execute habits --remote --file=schema.sql
```

把输出的 `database_id` 记下来。可写进 `wrangler.toml`，也可以只在 Dashboard 里绑定、不改文件。

### 3. 连接 GitHub 并创建 Pages 项目

1. [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → **Create** → **Pages** → **Connect to Git**。
2. 授权 GitHub，选择仓库 `casparlin/harbit_record`。
3. 构建设置：
   - Framework preset: `Vue`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`（不要填）
4. 先不要点 Deploy。先加绑定和环境变量。

### 4. 绑定 D1 和环境变量

在 Pages 项目 **Settings**：

- **Bindings** → **D1 database**
  - Variable name: `DB`（必须叫这个）
  - Database: 刚建的 `habits`
- **Variables and Secrets** → **Add**
  - Name: `SECRET_ACCESS_TOKEN`
  - Type: Secret
  - Value: 你在 Bitwarden 里那串
  - Environment: Production（Preview 若要用也加一份）

### 5. 部署

Settings 存好后，**Deployments** → **Retry deployment**，或推一次 commit。

部署成功后会得到 `https://xxxx.pages.dev`。用 Bitwarden 填充 Token 登录。

### 6. 挂自己的域名（可选）

Pages 项目 → **Custom domains** → 填你的域名或子域，按提示加 CNAME。

## 计分

每日满分 5 分。

- 早睡 / 锻炼 / 晨间学习：完成各 1 分
- 喝水：0–2 杯 0 分，3–4 杯 1 分，5 杯 2 分
