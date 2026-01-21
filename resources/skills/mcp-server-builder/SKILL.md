---
name: mcp-server-builder
description: |
  MCP 服务器构建工具 - 构建高质量的 MCP (Model Context Protocol) 服务器。
  使 LLM 能够与外部服务和数据源交互。当用户需要：构建 MCP 服务器、集成外部 API、创建工具时触发此技能。
---

# MCP 服务器构建指南

## 概述

MCP (Model Context Protocol) 是连接 Claude 与外部服务和数据源的开放标准。

**核心功能**：
- 工具定义和实现
- 资源管理
- 提示词模板
- 服务器生命周期管理

## MCP 架构

### 基本概念

**Tools (工具)**：AI 可调用的函数
**Resources (资源)**：服务器提供的数据（文件、API 响应等）
**Prompts (提示词)**：可重用的提示词模板

## Python 实现 (FastMCP)

### 快速开始

```python
from mcp.server.fastmcp import FastMCP
from mcp.server.stdio import stdio_server

# 创建 MCP 服务器
mcp = FastMCP("weather-server")

@mcp.tool()
async def get_weather(city: str) -> str:
    """获取城市天气信息

    Args:
        city: 城市名称
    """
    # 实现天气查询逻辑
    return f"{city} 的天气是晴天，25°C"

@mcp.resource("weather://forecast")
async def weather_forecast() -> str:
    """提供天气预报数据"""
    return "未来三天天气预报..."

# 启动服务器
async def main():
    async with stdio_server() as (read_stream, write_stream):
        await mcp.run(
            read_stream,
            write_stream,
            mcp.create_initialization_options()
        )

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

### 工具定义最佳实践

#### 1. 清晰的描述

```python
@mcp.tool()
async def search_files(
    query: str,
    path: str = ".",
    max_results: int = 10
) -> list[dict]:
    """搜索文件系统中的文件

    Args:
        query: 搜索关键词（支持通配符）
        path: 搜索路径（默认当前目录）
        max_results: 最大结果数（默认 10）

    Returns:
        匹配的文件列表，包含路径和元数据
    """
    # 实现
    pass
```

#### 2. 输入验证

```python
@mcp.tool()
async def read_file(path: str) -> str:
    """读取文件内容"""
    import os

    # 验证路径
    if not os.path.exists(path):
        raise ValueError(f"文件不存在: {path}")

    if not os.path.isfile(path):
        raise ValueError(f"路径不是文件: {path}")

    # 读取文件
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()
```

#### 3. 错误处理

```python
@mcp.tool()
async def api_request(url: str) -> dict:
    """发送 API 请求"""
    import aiohttp

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                response.raise_for_status()
                return await response.json()
    except aiohttp.ClientError as e:
        return {
            "error": str(e),
            "url": url
        }
```

### 资源定义

```python
@mcp.resource("config://settings")
async def get_config() -> dict:
    """获取服务器配置"""
    return {
        "version": "1.0.0",
        "features": ["tool1", "tool2"]
    }

@mcp.resource("logs://latest")
async def get_logs() -> str:
    """获取最新日志"""
    with open("app.log", "r") as f:
        return f.read()[-1000:]
```

### 提示词模板

```python
@mcp.prompt("analyze-code")
async def analyze_code_prompt(file_path: str) -> str:
    """生成代码分析提示词"""
    code = await read_file(file_path)
    return f"""请分析以下代码：

文件: {file_path}

```python
{code}
```

分析要点：
1. 代码质量
2. 潜在问题
3. 改进建议
"""
```

## Node.js/TypeScript 实现

### 基本结构

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// 创建服务器
const server = new Server(
  {
    name: "my-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "calculate",
      description: "执行数学计算",
      inputSchema: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "数学表达式"
          }
        },
        required: ["expression"]
      }
    }
  ]
}));

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "calculate") {
    const expression = request.params.arguments?.expression as string;
    try {
      const result = eval(expression);
      return {
        content: [{
          type: "text",
          text: String(result)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error}`
        }],
        isError: true
      };
    }
  }
  throw new Error("Unknown tool");
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

## 服务器配置

### package.json

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "bin": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc && node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 客户端配置

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["path/to/server/dist/index.js"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

## 最佳实践

### 1. 工具设计

- **单一职责**：每个工具做一件事
- **清晰命名**：使用描述性的工具名称
- **详细文档**：提供完整的描述和参数说明
- **输入验证**：验证所有输入参数

### 2. 错误处理

- **返回错误信息**：使用结构化的错误响应
- **记录日志**：记录错误和调试信息
- **优雅降级**：失败时返回有用信息

### 3. 性能优化

- **异步操作**：使用 async/await 处理 I/O
- **缓存策略**：缓存频繁访问的数据
- **流式响应**：对于大量数据使用流式传输

### 4. 安全考虑

- **输入清理**：防止注入攻击
- **访问控制**：限制敏感操作
- **环境变量**：使用环境变量存储密钥

## 依赖要求

**Python**:
```bash
pip install mcp fastmcp
```

**Node.js**:
```bash
npm install @modelcontextprotocol/sdk
```

## 测试

### 单元测试

```python
import pytest
from my_server import get_weather

@pytest.mark.asyncio
async def test_get_weather():
    result = await get_weather("北京")
    assert "25°C" in result
```

### 集成测试

```python
from mcp.client.session import ClientSession
from mcp.client.stdio import stdio_client

async def test_server():
    async with stdio_client() as (read, write):
        async with ClientSession(read, write) as session:
            # 初始化
            await session.initialize()

            # 调用工具
            result = await session.call_tool("get_weather", {"city": "北京"})
            assert result.content[0].text == "北京 的天气是晴天，25°C"
```

## 调试技巧

**日志记录**：
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**错误追踪**：
```python
import traceback
try:
    # 操作
except Exception as e:
    logging.error(traceback.format_exc())
```

## 代码风格指南

- 使用类型提示
- 编写文档字符串
- 遵循 PEP 8 (Python) 或 ESLint (TypeScript)
- 添加适当的注释
- 编写测试用例
