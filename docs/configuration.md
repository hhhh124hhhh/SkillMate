# 配置指南

SkillMate 提供灵活的配置选项，允许你自定义 API 连接、模型选择和其他高级设置。

## 默认配置

SkillMate 开箱即用，默认使用 Anthropic Claude API：

- **API URL**: `https://api.anthropic.com`
- **Model**: `claude-sonnet-4-5-20250514` (或最新版本)

这个配置经过优化，适合学习和研究 AI Agent 开发。

## 自定义配置

你可以通过点击应用界面右下角的齿轮图标 **(⚙️)** 访问设置面板。

### 修改 API 设置

如果你想使用其他兼容的模型（如 GPT、Gemini 等），请按需修改以下字段：

1. **API Key**: 输入你的提供商提供的 API 密钥
2. **API URL**: 输入提供商的 API 端点地址
3. **Model**: 输入你想调用的模型名称（例如 `gpt-4`、`gemini-pro`）

### 环境变量配置

在开发环境中，你也可以通过项目根目录的 `.env` 文件配置（不提交到 Git）：

```env
VITE_API_URL=https://api.anthropic.com
VITE_MODEL_NAME=claude-sonnet-4-5-20250514
```

### 配置存储位置

- **开发模式**: `.vscode/electron-userdata/config.json`
- **生产模式**: 系统用户数据目录 `config.json`

配置文件使用 `electron-store` 自动管理，支持加密存储敏感信息（如 API Key）。

## 高级配置

### MCP 服务器配置

SkillMate 支持 Model Context Protocol (MCP) 服务器扩展。详见 [MCP 集成指南](./mcp-integration.md)。

### 权限管理

配置文件包含权限设置，控制 AI 可以访问的文件夹和执行的命令：
- `authorizedFolders`: 允许访问的文件夹列表
- `allowedPermissions`: 已授权的权限记录

### 网络设置

- **代理支持**: 可配置 HTTP/HTTPS 代理
- **超时设置**: 自定义 API 请求超时时间
- **重试策略**: 配置失败重试次数和间隔

## 配置安全

- ✅ API Key 使用系统密钥链加密存储
- ✅ 配置文件不包含敏感信息（或加密存储）
- ✅ 支持配置导出和导入（不包含敏感信息）

## 常见问题

### Q: 如何重置配置？

A: 删除配置文件后重启应用即可恢复默认设置：
- Windows: `%APPDATA%/SkillMate/config.json`
- macOS: `~/Library/Application Support/SkillMate/config.json`
- Linux: `~/.config/SkillMate/config.json`

### Q: 配置文件会同步到 GitHub 吗？

A: 不会。`.env` 文件和包含敏感信息的配置文件已在 `.gitignore` 中排除。

### Q: 如何在不同机器间同步配置？

A: 使用"导出配置"功能（不包含 API Key），然后在目标机器导入。

---

**相关文档**:
- [快速开始](./getting-started.md)
- [MCP 集成](./mcp-integration.md)
- [开发指南](./development.md)
