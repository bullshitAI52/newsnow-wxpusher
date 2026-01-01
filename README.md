![](/public/og-image.png)

English | [简体中文](README.zh-CN.md) | [日本語](README.ja-JP.md)

> [!NOTE]
> This is a demo version currently supporting Chinese only. A full-featured version with better customization and English content support will be released later.

**_Elegant reading of real-time and hottest news_**

## Features

- Clean and elegant UI design for optimal reading experience
- Real-time updates on trending news
- GitHub OAuth login with data synchronization
- 30-minute default cache duration (logged-in users can force refresh)
- Adaptive scraping interval (minimum 2 minutes) based on source update frequency to optimize resource usage and prevent IP bans
- support MCP server

```json
{
  "mcpServers": {
    "newsnow": {
      "command": "npx",
      "args": [
        "-y",
        "newsnow-mcp-server"
      ],
      "env": {
        "BASE_URL": "https://newsnow.busiyi.world"
      }
    }
  }
}
```
You can change the `BASE_URL` to your own domain.

## Deployment

### Basic Deployment

For deployments without login and caching:

1. Fork this repository
2. Import to platforms like Cloudflare Page or Vercel

### Cloudflare Page Configuration

- Build command: `pnpm run build`
- Output directory: `dist/output/public`

### GitHub OAuth Setup

1. [Create a GitHub App](https://github.com/settings/applications/new)
2. No special permissions required
3. Set callback URL to: `https://your-domain.com/api/oauth/github` (replace `your-domain` with your actual domain)
4. Obtain Client ID and Client Secret

### Environment Variables

Refer to `example.env.server`. For local development, rename it to `.env.server` and configure:

```env
# Github Client ID
G_CLIENT_ID=
# Github Client Secret
G_CLIENT_SECRET=
# JWT Secret, usually the same as Client Secret
JWT_SECRET=
# Initialize database, must be set to true on first run, can be turned off afterward
INIT_TABLE=true
# Whether to enable cache
ENABLE_CACHE=true
```

### Database Support

Supported database connectors: https://db0.unjs.io/connectors
**Cloudflare D1 Database** is recommended.

1. Create D1 database in Cloudflare Worker dashboard
2. Configure database_id and database_name in wrangler.toml
3. If wrangler.toml doesn't exist, rename example.wrangler.toml and modify configurations
4. Changes will take effect on next deployment

### Docker Deployment

In project root directory:

```sh
docker compose up
```

You can also set Environment Variables in `docker-compose.yml`.

## Development

> [!Note]
> Requires Node.js >= 20

```sh
corepack enable
pnpm i
pnpm dev
```

### Adding Data Sources

Refer to `shared/sources` and `server/sources` directories. The project provides complete type definitions and a clean architecture.

For detailed instructions on how to add new sources, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

- Add **multi-language support** (English, Chinese, more to come).
- Improve **personalization options** (category-based news, saved preferences).
- Expand **data sources** to cover global news in multiple languages.

**_release when ready_**
![](https://testmnbbs.oss-cn-zhangjiakou.aliyuncs.com/pic/20250328172146_rec_.gif?x-oss-process=base_webp)

## WxPusher 定时推送

此功能通过 GitHub Actions 定时将热门新闻推送到微信（使用 WxPusher 服务）。

### 配置步骤

1. **获取 WxPusher 配置**
   - 注册 [WxPusher](https://wxpusher.zjiecode.com/) 并创建应用
   - 获取 `APP_TOKEN` 和你的 `UID`

2. **设置 GitHub Secrets**
   - Fork 本仓库到你的 GitHub 账户
   - 进入仓库 Settings → Secrets and variables → Actions
   - 添加以下 Secrets：
     - `WXPUSHER_APP_TOKEN`: 你的 WxPusher APP_TOKEN
     - `WXPUSHER_USER_ID`: 你的 WxPusher UID
     - `BASE_URL`: (可选) 你的 NewsNow 部署地址，默认为 `https://newsnow.busiyi.world`
     - `SOURCE_IDS`: (可选) 要推送的新闻源 ID，用逗号分隔，默认为 `weibo,zhihu,baidu,bilibili`
     - `MAX_ITEMS_PER_SOURCE`: (可选) 每个源推送的最大条目数，默认为 `3`

3. **启用 GitHub Actions**
   - 工作流已配置为每天北京时间 6:00, 12:00, 18:00, 22:00 自动运行
   - 你也可以在 Actions 标签页手动触发 "Push News to WxPusher" 工作流

### 自定义配置

- 修改 `.github/workflows/push-news.yml` 中的 cron 表达式调整推送时间
- 修改 `scripts/push-news.ts` 自定义消息格式
- 支持的新闻源 ID 见 `shared/sources.json`

### 本地测试

```bash
# 安装依赖
corepack enable
pnpm install

# 设置环境变量并运行
WXPUSHER_APP_TOKEN=your_token WXPUSHER_USER_ID=your_uid pnpm exec tsx scripts/push-news.ts
```

## Contributing

Contributions are welcome! Feel free to submit pull requests or create issues for feature requests and bug reports.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to contribute, especially for adding new data sources.

## License

[MIT](./LICENSE) © ourongxing
