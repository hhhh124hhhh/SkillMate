# 百度 MCP 配置修复总结

**修复时间**: 2026-01-25
**修复原因**: 根据百度官方文档和用户提供的实际配置，纠正了错误的 URL 和认证格式

---

## ❌ 修复前（错误配置）

### mcp-templates.json
```json
{
  "baidu-search": {
    "type": "streamableHttp",
    "baseUrl": "https://ai.baidu.com/appbuilder/v2/ai_search/mcp/sse",  ❌ 错误 URL
    "headers": {
      "Authorization": "Bearer+YOUR_BAIDU_API_KEY_HERE"  ❌ 使用加号
    }
  }
}
```

### MCPManager.tsx
```typescript
servers['baidu-search'] = {
  baseUrl: 'https://ai.baidu.com/appbuilder/v2/ai_search/mcp/sse',  ❌
  headers: {
    Authorization: `Bearer+${apiKey.trim()}`  ❌ 使用加号
  }
};
```

**问题**:
1. ❌ URL 错误：使用了旧的 `ai.baidu.com` 域名和 `/sse` 路径
2. ❌ 认证格式错误：使用了 `Bearer+`（加号）而不是 `Bearer `（空格）
3. ❌ API Key 创建链接错误：指向了错误的控制台页面

---

## ✅ 修复后（正确配置）

### 1. mcp-templates.json

```json
{
  "baidu-search": {
    "description": "百度千帆AI搜索 - 实时信息检索与总结，支持使用大模型进行回复（需要千帆 AppBuilder API Key）",
    "type": "streamableHttp",
    "baseUrl": "https://qianfan.baidubce.com/v2/ai_search/mcp",  ✅ 正确 URL
    "headers": {
      "Authorization": "Bearer YOUR_BAIDU_API_KEY_HERE"  ✅ 使用空格
    },
    "disabled": true,
    "_docs": "获取 API Key: https://console.bce.baidu.com/qianfan/planet/apiKey （服务选择「千帆 AppBuilder」）",
    "_note": "请将 YOUR_BAIDU_API_KEY_HERE 替换为实际的千帆 AppBuilder API Key（格式：Bearer bce-v3/ALTAK...Altc/...）。配置后自动启用。",
    "_alternative": "备用格式：http://appbuilder.baidu.com/v2/ai_search/mcp/sse?api_key=Bearer+YOUR_API_KEY"
  }
}
```

### 2. MCPManager.tsx

**配置函数** (第 327-336 行):
```typescript
servers['baidu-search'] = {
  ...servers['baidu-search'],
  baseUrl: 'https://qianfan.baidubce.com/v2/ai_search/mcp',  ✅ 正确的千帆 URL
  headers: {
    ...servers['baidu-search']?.headers,
    Authorization: `Bearer ${apiKey.trim()}`  ✅ 使用空格而不是加号
  },
  disabled: false  // 自动启用
};
```

**UI 提示** (第 567-569 行):
```tsx
<p className="text-xs text-yellow-400 mb-2">
  ⚠️ 格式提示：直接粘贴 API Key（如 bce-v3/ALTAK-xxxxx/Altc/xxxxx），系统会自动添加 "Bearer " 前缀（注意是空格）
</p>
```

**帮助链接** (第 588 行):
```tsx
<a href="https://console.bce.baidu.com/qianfan/planet/apiKey">
  如何获取 API Key?
</a>
```

---

## 📋 修复内容清单

### 1. URL 修正
- ❌ 旧: `https://ai.baidu.com/appbuilder/v2/ai_search/mcp/sse`
- ✅ 新: `https://qianfan.baidubce.com/v2/ai_search/mcp`

### 2. 认证格式修正
- ❌ 旧: `Bearer+`（使用加号）
- ✅ 新: `Bearer `（使用空格）

### 3. API Key 类型说明
- ✅ 明确说明需要使用 **千帆 AppBuilder** 的 API Key
- ✅ 提供正确的 API Key 格式示例：`bce-v3/ALTAK...Altc/...`

### 4. 控制台链接修正
- ❌ 旧: `https://console.bce.baidu.com/iam/#/iam/apikey/list`
- ✅ 新: `https://console.bce.baidu.com/qianfan/planet/apiKey`

### 5. 备用格式说明
- ✅ 添加 `_alternative` 字段，说明可以将 API Key 放在 URL 查询参数中
- 格式：`http://appbuilder.baidu.com/v2/ai_search/mcp/sse?api_key=Bearer+YOUR_API_KEY`

---

## 📚 官方文档参考

根据百度千帆 AppBuilder 官方文档：

### 标准配置方式（推荐）
```json
{
  "mcpServers": {
    "baidu-search": {
      "type": "streamableHttp",
      "baseUrl": "https://qianfan.baidubce.com/v2/ai_search/mcp",
      "headers": {
        "Authorization": "Bearer bce-v3/ALTAK...Altc/..."
      }
    }
  }
}
```

### 备用配置方式（兼容）
```json
{
  "mcpServers": {
    "baidu-search": {
      "type": "streamableHttp",
      "baseUrl": "http://appbuilder.baidu.com/v2/ai_search/mcp/sse",
      "headers": {
        "Authorization": "Bearer bce-v3/ALTAK...Altc/..."
      }
    }
  }
}
```

或使用查询参数：
```
http://appbuilder.baidu.com/v2/ai_search/mcp/sse?api_key=Bearer+YOUR_API_KEY
```

---

## 🎯 API Key 获取步骤

### Step 1: 登录百度控制台
访问：https://console.bce.baidu.com/qianfan/planet/apiKey

### Step 2: 创建 API Key
1. 点击"**创建API Key**"
2. **服务选择**：选择"**千帆 AppBuilder**"（重要！）
3. 配置权限策略（建议使用最小权限原则）
4. 点击"**确定**"

### Step 3: 复制 API Key
生成的 API Key 格式：
```
bce-v3/ALTAK-xxxxxxxxxxxxx/Altc/xxxxxxxxxxxxx
```

### Step 4: 在应用中配置
1. 进入"**设置 > MCP 扩展**"
2. 找到"**百度千帆搜索**"
3. 粘贴 API Key（如 `bce-v3/ALTAK-xxx/Altc/xxx`）
4. 点击"**配置并启用**"

**注意**：
- ✅ 只粘贴 API Key 本身，不要包含 `Bearer ` 前缀
- ✅ 系统会自动添加 `Bearer ` 前缀（使用空格）
- ❌ 不要使用 `Bearer+`（加号）格式

---

## 🔍 故障排查

### 问题 1: 连接失败（401 认证错误）

**可能原因**:
- API Key 格式错误
- 使用了错误的服务 API Key（应为千帆 AppBuilder）

**解决方案**:
1. 确认 API Key 格式：`bce-v3/ALTAK-xxx/Altc/xxx`
2. 确认服务类型：千帆 AppBuilder
3. 确认前缀格式：`Bearer `（空格）

### 问题 2: URL 解析错误

**可能原因**:
- 使用了旧的 URL 格式

**解决方案**:
1. 删除用户配置文件中的旧配置
2. 重新启动应用，使用新的模板配置
3. 重新配置 API Key

### 问题 3: MCP 工具不显示

**可能原因**:
- 服务器未成功连接

**解决方案**:
1. 检查主进程日志
2. 确认 URL 正确：`https://qianfan.baidubce.com/v2/ai_search/mcp`
3. 测试网络连接

---

## ✅ 验证测试

完成修复后，请按以下步骤验证：

### 1. 检查配置
```bash
# 查看用户配置
cat ~/.aiagent/mcp.json

# 应该看到：
{
  "mcpServers": {
    "baidu-search": {
      "baseUrl": "https://qianfan.baidubce.com/v2/ai_search/mcp",
      "headers": {
        "Authorization": "Bearer bce-v3/ALTAK..."
      }
    }
  }
}
```

### 2. 启动应用测试
```bash
npm run dev
```

### 3. 检查连接状态
进入"**设置 > MCP 扩展**"，确认"**百度千帆搜索**"显示"**已连接**"

### 4. 测试 AI 搜索功能
在聊天中输入：
```
使用百度搜索：今天的科技新闻
```

**预期结果**:
- ✅ AI 调用 `baidu-search__mcp_search` 工具
- ✅ 返回搜索结果摘要
- ✅ 包含来源链接

---

## 📚 相关文档

- [百度智能搜索生成 API 文档](https://ai.baidu.com/ai-doc/AppBuilder/amaxd2det)
- [千帆 AppBuilder 控制台](https://console.bce.baidu.com/qianfan/planet/apiKey)
- [MCP_USER_TEST_GUIDE.md](./MCP_USER_TEST_GUIDE.md) - 用户测试指南
- [FETCH_MCP_VERIFICATION_REPORT.md](./FETCH_MCP_VERIFICATION_REPORT.md) - Fetch MCP 验证报告

---

**修复人**: Claude (AI Assistant)
**修复时间**: 2026-01-25 21:00
**修复文件**:
- `resources/mcp-templates.json`（百度配置模板）
- `src/components/MCPManager.tsx`（百度配置处理函数和 UI）

**下一步**: 用户需要获取千帆 AppBuilder API Key 并在应用中配置测试
