# MCP 集成指南

MCP (Model Context Protocol) 是一个开放协议，允许 AI Agent 集成外部工具和数据源。本指南将教你如何配置和扩展 MCP 服务器。

---

## 一、什么是 MCP？

### 1.1 MCP 简介

MCP 是由 Anthropic 开发的标准化协议，用于连接 AI 模型与外部资源。

**核心价值**:
- 🔌 **统一接口**: 标准化的工具调用协议
- 🚀 **无限扩展**: 支持任何类型的工具和服务
- 🛡️ **安全隔离**: 工具运行在独立进程中
- 📦 **类型安全**: JSON Schema 定义参数格式

**MCP 生态**:
- [MCP 官网](https://modelcontextprotocol.io)
- [MCP SDK](https://github.com/modelcontextprotocol)
- [MCP Servers](https://github.com/modelcontextprotocol/servers)

### 1.2 MCP 在 AI Agent Desktop 中的角色

```
AI Agent Desktop
    │
    ├─► 内置工具（文件操作、命令执行）
    │
    ├─► 技能工具（Python 脚本）
    │
    └─► MCP 工具（外部服务）◄─── 本指南重点
         │
         ├─ 文件系统访问 (filesystem)
         ├─ 网页抓取 (fetch)
         ├─ 搜索引擎 (brave-search)
         ├─ Git 操作 (git)
         └─ 自定义服务
```

---

## 二、MCP 配置格式

### 2.1 配置文件位置

**开发环境**:
- `~/.aiagent/mcp.json`（用户配置）
- `mcp.json`（项目根目录，模板）

**生产环境**:
- `~/.aiagent/mcp.json`（用户配置）

**优先级**:
```
用户配置 > 项目模板
```

### 2.2 标准配置格式

```json
{
  "mcpServers": {
    "server_name": {
      "name": "服务器名称",
      "description": "服务器描述",
      "type": "stdio" | "streamableHttp",
      // stdio 类型必需：
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-name", "ARG1"],
      "env": { "API_KEY": "value" },
      // streamableHttp 类型必需：
      "baseUrl": "https://api.example.com",
      "headers": { "Authorization": "Bearer token" }
    }
  }
}
```

### 2.3 字段说明

#### 必需字段

**name** (string)
- 服务器名称，用作工具命名空间前缀
- 格式：小写英文，使用连字符
- 示例：`filesystem`, `fetch`, `git`

**type** (string)
- 连接类型，可选值：
  - `stdio`: 命令行方式启动（本地进程）
  - `streamableHttp`: HTTP API 方式连接（远程服务）

#### 可选字段

**description** (string)
- 服务器功能描述
- 帮助理解服务器的用途

**command** (string)
- stdio 类型必需
- 启动 MCP 服务器的命令
- 示例：`npx`, `node`, `python`

**args** (array)
- stdio 类型必需
- 传递给命令的参数列表
- 示例：`["-y", "@modelcontextprotocol/server-filesystem", "/path"]`

**env** (object)
- stdio 类型可选
- 环境变量，用于传递密钥等敏感信息
- 示例：`{"API_KEY": "sk-xxx", "ENDPOINT": "https://api.com"}`

**baseUrl** (string)
- streamableHttp 类型必需
- MCP 服务器的基础 URL
- 示例：`https://api.example.com/mcp`

**headers** (object)
- streamableHttp 类型可选
- HTTP 请求头，用于认证
- 示例：`{"Authorization": "Bearer token"}`

---

## 三、配置示例

### 3.1 stdio 类型服务器

#### 文件系统服务器

```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "description": "本地文件系统访问",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:/Projects"],
      "env": {}
    }
  }
}
```

**可用工具**:
- `filesystem__read_file`: 读取文件
- `filesystem__write_file`: 写入文件
- `filesystem__list_directory`: 列出目录
- `filesystem__directory_tree`: 目录树

**使用方式**:
```
用户：读取 D:/Projects/README.md 的内容
AI → 调用 filesystem__read_file 工具
```

#### Git 服务器

```json
{
  "mcpServers": {
    "git": {
      "name": "git",
      "description": "Git 版本控制操作",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "--allowed-repos", "D:/Projects/*"],
      "env": {}
    }
  }
}
```

**可用工具**:
- `git__clone`: 克隆仓库
- `git__commit`: 提交更改
- `git__push`: 推送到远程
- `git__status`: 查看状态

#### PostgreSQL 服务器

```json
{
  "mcpServers": {
    "postgres": {
      "name": "postgres",
      "description": "PostgreSQL 数据库访问",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/dbname"
      }
    }
  }
}
```

### 3.2 streamableHttp 类型服务器

#### 自定义 API 服务器

```json
{
  "mcpServers": {
    "custom-api": {
      "name": "custom-api",
      "description": "自定义 HTTP API",
      "type": "streamableHttp",
      "baseUrl": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer sk-xxx",
        "X-Custom-Header": "value"
      }
    }
  }
}
```

### 3.3 环境变量管理

**使用环境变量引用**:

```json
{
  "mcpServers": {
    "openai": {
      "name": "openai",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-openai"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

**设置环境变量**:

**macOS/Linux**:
```bash
export OPENAI_API_KEY="sk-xxx"
```

**Windows (PowerShell)**:
```powershell
$env:OPENAI_API_KEY="sk-xxx"
```

**Windows (CMD)**:
```cmd
set OPENAI_API_KEY=sk-xxx
```

---

## 四、常用 MCP 服务器

### 4.1 官方服务器

| 服务器 | 功能 | 安装 |
|--------|------|------|
| `@modelcontextprotocol/server-filesystem` | 文件系统访问 | `npx -y @modelcontextprotocol/server-filesystem /path` |
| `@modelcontextprotocol/server-fetch` | 网页抓取 | `npx -y @modelcontextprotocol/server-fetch` |
| `@modelcontextprotocol/server-git` | Git 操作 | `npx -y @modelcontextprotocol/server-git` |
| `@modelcontextprotocol/server-postgres` | PostgreSQL | `npx -y @modelcontextprotocol/server-postgres` |
| `@modelcontextprotocol/server-brave-search` | Brave 搜索 | `npx -y @modelcontextprotocol/server-brave-search` |
| `@modelcontextprotocol/server-memory` | 内存存储 | `npx -y @modelcontextprotocol/server-memory` |

### 4.2 完整配置示例

```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "description": "本地文件系统访问",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:/Projects", "D:/Documents"],
      "env": {}
    },
    "fetch": {
      "name": "fetch",
      "description": "网页内容抓取",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "env": {}
    },
    "git": {
      "name": "git",
      "description": "Git 版本控制",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "--allowed-repos", "D:/Projects/*"],
      "env": {}
    },
    "brave-search": {
      "name": "brave-search",
      "description": "Brave 搜索引擎",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    }
  }
}
```

---

## 五、配置步骤

### 5.1 通过 UI 配置（推荐）

1. **打开设置**
   - 点击右上角 ⚙️ 设置图标
   - 选择 "MCP 配置" 标签

2. **添加服务器**
   - 点击 "添加服务器" 按钮
   - 选择服务器类型（stdio 或 streamableHttp）

3. **填写配置**
   - **stdio 类型**:
     - 服务器名称（如 `filesystem`）
     - 描述（可选）
     - 启动命令（如 `npx`）
     - 命令参数（如 `-y @modelcontextprotocol/server-filesystem D:/Projects`）
     - 环境变量（可选）
   - **streamableHttp 类型**:
     - 服务器名称（如 `custom-api`）
     - Base URL（如 `https://api.example.com/mcp`）
     - HTTP Headers（可选）

4. **测试连接**
   - 点击 "测试连接" 按钮
   - 查看工具列表是否正常显示

5. **保存配置**
   - 点击 "保存配置" 按钮
   - 重启应用生效

### 5.2 手动配置

1. **创建配置文件**
   ```bash
   # macOS/Linux
   cat > ~/.aiagent/mcp.json << 'EOF'
   {
     "mcpServers": {
       "filesystem": {
         "name": "filesystem",
         "type": "stdio",
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
       }
     }
   }
   EOF

   # Windows (PowerShell)
   @{
     "mcpServers" = @{
       "filesystem" = @{
         "name" = "filesystem"
         "type" = "stdio"
         "command" = "npx"
         "args" = @("-y", "@modelcontextprotocol/server-filesystem", "D:/Projects")
       }
     }
   } | ConvertTo-Json | Out-File -FilePath "$env:USERPROFILE\.aiagent\mcp.json" -Encoding utf8
   ```

2. **重启应用**
   - MCP 客户端会在启动时自动加载配置

---

## 六、开发自定义 MCP 服务器

### 6.1 使用 FastMCP（Python）

**安装**:
```bash
pip install fastmcp
```

**示例服务器**:

```python
#!/usr/bin/env python3
"""
示例 MCP 服务器 - 提供简单的计算工具
"""

from fastmcp import FastMCP

# 创建 MCP 服务器实例
mcp = FastMCP("calculator")


@mcp.tool()
def add(a: int, b: int) -> int:
    """加法运算

    Args:
        a: 第一个数
        b: 第二个数

    Returns:
        两数之和
    """
    return a + b


@mcp.tool()
def multiply(a: int, b: int) -> int:
    """乘法运算

    Args:
        a: 第一个数
        b: 第二个数

    Returns:
        两数之积
    """
    return a * b


@mcp.resource("calc://constants")
def get_constants() -> str:
    """获取数学常数"""
    return "π = 3.14159, e = 2.71828"


if __name__ == "__main__":
    mcp.run()
```

**配置**:

```json
{
  "mcpServers": {
    "calculator": {
      "name": "calculator",
      "description": "计算器服务",
      "type": "stdio",
      "command": "python",
      "args": ["D:/path/to/calculator_server.py"],
      "env": {}
    }
  }
}
```

### 6.2 使用 MCP SDK（TypeScript）

**安装**:
```bash
npm install @modelcontextprotocol/sdk
```

**示例服务器**:

```typescript
#!/usr/bin/env node
/**
 * 示例 MCP 服务器 - 天气查询
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// 创建服务器实例
const server = new Server(
  {
    name: 'weather-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_weather',
        description: '获取指定城市的天气信息',
        inputSchema: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: '城市名称',
            },
          },
          required: ['city'],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_weather') {
    const city = args?.city as string;
    // 模拟天气数据
    const weather = {
      city,
      temperature: 25,
      condition: '晴',
      humidity: 60,
    };
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(weather, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Weather MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
```

**配置**:

```json
{
  "mcpServers": {
    "weather": {
      "name": "weather",
      "description": "天气查询服务",
      "type": "stdio",
      "command": "node",
      "args": ["D:/path/to/weather_server.js"],
      "env": {}
    }
  }
}
```

### 6.3 部署 MCP 服务器

**本地开发**:
```bash
# Python
python my_server.py

# TypeScript
node my_server.js
```

**发布到 npm**:
```bash
npm init -y
npm install @modelcontextprotocol/sdk
# ... 开发代码 ...
npm publish
```

**用户使用**:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-published-mcp-server"]
    }
  }
}
```

---

## 七、故障排查

### 7.1 服务器无法启动

**症状**: 添加配置后看不到工具列表

**排查步骤**:
1. 检查命令和参数是否正确
2. 手动运行命令测试：
   ```bash
   npx -y @modelcontextprotocol/server-filesystem D:/Projects
   ```
3. 查看主进程日志（开发模式终端输出）

**常见错误**:
- ❌ 路径包含空格未加引号
- ❌ 参数格式错误（少了 `-y` 标志）
- ❌ 环境变量未设置

### 7.2 工具调用失败

**症状**: AI 调用工具时返回错误

**排查步骤**:
1. 确认工具名称正确（带 `server__` 前缀）
2. 检查参数是否符合 JSON Schema
3. 查看权限设置（是否允许操作）

**常见错误**:
- ❌ 工具名称错误（如 `read_file` 应为 `filesystem__read_file`）
- ❌ 参数类型不匹配
- ❌ 未授权路径访问

### 7.3 连接超时

**症状**: 测试连接时长时间无响应

**排查步骤**:
1. 检查网络连接
2. 检查 API Key 是否有效
3. 检查防火墙设置

**解决方法**:
- stdio 类型：确保命令可以正常启动
- streamableHttp 类型：确保 baseUrl 可访问

### 7.4 调试技巧

**启用调试日志**:

```bash
# Windows
set DEBUG=mcp:*

# macOS/Linux
export DEBUG=mcp:*
```

**查看日志**:
- 开发模式：终端输出
- 生产模式：查看应用日志目录

---

## 八、最佳实践

### 8.1 安全性

**路径限制**:
```json
{
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:/Projects"]
}
```
✅ 仅允许访问指定目录
❌ 不要使用根目录 `/` 或 `C:/`

**密钥管理**:
```json
{
  "env": {
    "API_KEY": "${MY_API_KEY}"
  }
}
```
✅ 使用环境变量
❌ 不要硬编码密钥在配置文件中

**HTTPS 优先**:
```json
{
  "baseUrl": "https://api.example.com"
}
```
✅ 使用 HTTPS
❌ 避免使用 HTTP（除非开发环境）

### 8.2 性能优化

**按需启用服务器**:
- 仅配置需要的服务器
- 避免同时启动多个重量级服务器

**使用缓存**:
- `@modelcontextprotocol/server-memory` 可用于缓存结果

**超时设置**:
- 在服务器代码中实现超时机制

### 8.3 可维护性

**描述清晰**:
```json
{
  "description": "文件系统访问 - 允许 AI 读写 D:/Projects 目录"
}
```

**命名规范**:
- 服务器名称：小写英文，连字符
- 工具名称：`server__tool_name`

**版本管理**:
- 记录使用的 MCP 服务器版本
- 固定版本号：`@modelcontextprotocol/server-filesystem@1.0.0`

---

## 九、资源链接

- **MCP 官网**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
- **MCP SDK**: [GitHub - modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **官方服务器**: [GitHub - modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- **FastMCP**: [PyPI - fastmcp](https://pypi.org/project/fastmcp/)
- **社区讨论**: [MCP Discord](https://discord.gg/mcp)

---

## 十、总结

MCP 协议为 AI Agent Desktop 提供了无限扩展能力。通过配置 MCP 服务器，你可以：

- ✅ 集成外部 API 和服务
- ✅ 访问本地资源（文件、数据库、Git）
- ✅ 开发自定义工具
- ✅ 构建强大的 AI Agent

**下一步**:
- 尝试配置一个官方 MCP 服务器
- 开发你的第一个自定义 MCP 服务器
- 分享你的 MCP 服务器到社区

---

<p align="center">
  <b>开始构建你的 MCP 生态</b> 🚀
</p>
