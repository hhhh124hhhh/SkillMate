## 修复 StreamableHttpClientTransport 导入错误

### 问题分析
1. **导入名称错误**：在 `MCPClientService.ts` 中导入的类名是 `StreamableHttpClientTransport`，但实际导出的类名是 `StreamableHTTPClientTransport`（注意 HTTP 是大写）
2. **构造函数参数错误**：实际构造函数接受两个参数 `(url, opts)`，但代码尝试传递一个对象 `{ url: config.baseUrl, headers: config.headers || {} }`

### 修复步骤
1. **修正导入语句**：将导入名称改为正确的 `StreamableHTTPClientTransport`
2. **修正构造函数调用**：将参数格式改为 `(config.baseUrl, { requestInit: { headers: config.headers || {} } })`

### 具体修改
- 文件：`electron/agent/mcp/MCPClientService.ts`
- 第3行：修正导入语句
- 第71-74行：修正构造函数调用

### 预期结果
修复后，TypeScript 编译错误应该消失，MCP 客户端能够正常连接到 HTTP 服务器。