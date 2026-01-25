# 🚀 MCP 自定义服务器 - 快速开始指南

## 🎯 3分钟上手

### 方式1：添加 STDIO 类型服务器（本地进程）

**适用场景**：运行本地的 MCP 服务器（如文件系统、数据库等）

#### 步骤：

1. **打开 MCP 配置界面**
   - 点击应用左侧设置图标
   - 选择 "MCP 配置"

2. **点击"添加自定义服务器"按钮**
   - 紫色渐变按钮，位于扩展市场视图右上角

3. **填写配置**
   ```
   服务器名称: my-filesystem
   描述: 我的文件系统访问

   连接类型: 选择 STDIO (橙色)

   启动命令: npx
   参数: -y @modelcontextprotocol/server-filesystem /Users/xxx/Desktop
   ```

4. **测试连接**
   - 点击"测试连接"按钮
   - 等待结果（通常 5-30 秒）
   - 成功会显示：✅ 连接成功 (1234ms)

5. **添加服务器**
   - 点击"添加服务器"按钮
   - 完成！

---

### 方式2：添加 HTTP 类型服务器（远程服务）

**适用场景**：连接远程 MCP API 服务

#### 步骤：

1-2. 同上

3. **填写配置**
   ```
   服务器名称: my-http-api
   描述: 自定义 HTTP API 服务

   连接类型: 选择 HTTP (紫色)

   服务器 URL: https://api.example.com/mcp

   请求头（可选）:
   {
     "Authorization": "Bearer YOUR_TOKEN"
   }
   ```

4-5. 同上

---

## 💡 常见配置示例

### 示例1：本地文件系统访问

```json
服务器名称: filesystem
描述: 访问指定目录的文件
连接类型: STDIO
启动命令: npx
参数: -y @modelcontextprotocol/server-filesystem /Users/xxx/Documents
```

### 示例2：GitHub 集成

```json
服务器名称: github
描述: GitHub 仓库操作
连接类型: STDIO
启动命令: npx
参数: -y @modelcontextprotocol/server-github
```

### 示例3：PostgreSQL 数据库

```json
服务器名称: postgres
描述: PostgreSQL 数据库访问
连接类型: STDIO
启动命令: npx
参数: -y @modelcontextprotocol/server-postgres "postgresql://user:pass@localhost:5432/db"
环境变量: {}
```

### 示例4：自定义 HTTP API

```json
服务器名称: my-api
描述: 公司内部 MCP API
连接类型: HTTP
服务器 URL: https://api.company.com/mcp
请求头: {
  "Authorization": "Bearer abc123",
  "X-Custom-Header": "value"
}
```

---

## ⚠️ 常见问题

### Q1: 测试连接失败怎么办？

**可能原因**：
1. **命令错误**：检查启动命令是否正确
2. **参数错误**：检查参数格式是否正确
3. **网络问题**：HTTP服务器检查网络连接
4. **权限问题**：检查文件访问权限

**解决方法**：
- 查看终端日志（开发模式）
- 手动运行命令测试
- 检查 MCP 服务器文档

### Q2: 如何删除自定义服务器？

**方法**：
1. 在"已安装"视图中找到服务器
2. 点击"删除"按钮（垃圾桶图标）
3. 确认删除

### Q3: 如何编辑自定义服务器？

**方法**：
1. 在"已安装"视图中找到服务器
2. 点击"配置"按钮（设置图标）
3. 修改配置后保存

### Q4: 环境变量如何配置？

**JSON 格式**：
```json
{
  "API_KEY": "your-api-key",
  "SECRET": "your-secret",
  "REGION": "us-east-1"
}
```

**注意**：
- 必须是有效的 JSON 格式
- 键名使用大写（推荐）
- 不要在 JSON 中写注释

### Q5: 配置保存在哪里？

**位置**：
```
~/.aiagent/mcp.json
```

**结构**：
```json
{
  "mcpServers": {
    "my-server": { /* 配置 */ }
  },
  "customServers": {
    "my-server": { /* 同样的配置 */ }
  }
}
```

---

## 🔧 高级用法

### 1. 从配置文件导入

编辑 `~/.aiagent/mcp.json`：

```json
{
  "mcpServers": {
    "my-server": {
      "name": "my-server",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
      "isCustom": true,
      "disabled": false
    }
  },
  "customServers": {
    "my-server": {
      "name": "my-server",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
      "isCustom": true,
      "disabled": false
    }
  }
}
```

### 2. 临时禁用服务器

在配置中设置 `"disabled": true`

```json
{
  "mcpServers": {
    "my-server": {
      "name": "my-server",
      "disabled": true  // 暂时禁用
    }
  }
}
```

### 3. 使用环境变量

在表单的"环境变量"部分配置：

```json
{
  "MY_API_KEY": "sk-xxxxxxxx",
  "MY_SECRET": "secret123"
}
```

这些变量会被注入到 MCP 服务器的运行环境中。

---

## 📚 参考资源

### 官方文档
- [MCP 官方网站](https://modelcontextprotocol.io/)
- [MCP 服务器列表](https://github.com/modelcontextprotocol/servers)

### 社区资源
- [Cursor MCP 配置指南](https://medium.com/@connectshefeek/configuring-cursor-ai-as-your-mcp-model-context-protocol-client-57a6c1775452)
- [JetBrains MCP 文档](https://www.jetbrains.com/help/ai-assistant/mcp.html)

### 项目文档
- [完整实施总结](MCP_CUSTOM_SERVERS_COMPLETE.md)
- [实施细节文档](MCP_CUSTOM_SERVERS_IMPLEMENTATION.md)

---

## 🎓 视频教程（TODO）

- [ ] 添加第一个自定义服务器（3分钟）
- [ ] 配置 HTTP MCP 服务器（2分钟）
- [ ] 故障排查技巧（5分钟）

---

**提示**：如果遇到问题，请查看应用终端日志（开发模式下自动显示），或参考上面的常见问题部分。

**需要帮助？**：
1. 查看完整文档：[MCP_CUSTOM_SERVERS_COMPLETE.md](MCP_CUSTOM_SERVERS_COMPLETE.md)
2. 检查配置文件：`~/.aiagent/mcp.json`
3. 查看终端日志获取详细错误信息
