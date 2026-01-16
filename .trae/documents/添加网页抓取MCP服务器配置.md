# 添加网页抓取MCP服务器配置

## 目标
在项目中添加 `fetcher` MCP服务器配置，使用 `npx -y fetcher-mcp` 命令启动网页抓取服务。

## 实现步骤

### 1. 创建配置目录
- 检查并创建 `%USERPROFILE%\.opencowork` 目录（如果不存在）

### 2. 创建MCP配置文件
- 在上述目录中创建 `mcp.json` 文件
- 添加以下配置内容：
  ```json
  {
    "mcpServers": {
      "fetcher": {
        "name": "fetcher",
        "command": "npx",
        "args": ["-y", "fetcher-mcp"]
      }
    }
  }
  ```

### 3. 验证配置
- 启动应用，检查MCP服务是否成功连接
- 验证 `fetcher` 相关工具是否出现在工具列表中

## 技术说明
- MCP配置文件位置：`~/.opencowork/mcp.json`
- 配置结构符合项目现有的 `MCPServerConfig` 接口定义
- 应用启动时会自动加载此配置并连接到MCP服务器
- 工具会以 `fetcher__{tool_name}` 的命名空间出现在工具列表中

## 预期效果
添加配置后，应用将能够使用 `fetcher-mcp` 提供的网页抓取能力，无需额外的用户设置或配置。