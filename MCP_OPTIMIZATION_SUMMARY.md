# MCP 优化总结 - 移除豆包重复功能

**优化时间**: 2026-01-25
**优化原因**: 百度和豆包搜索功能重复，同时启用会导致工具冲突

---

## 🎯 优化决策

### 用户反馈
> "百度可以用 还需要使用豆包吗 我发现启用一个 另一个就不能用了"

### 问题分析
1. **功能重复**：百度千帆和豆包火山引擎都是 AI 搜索功能
2. **工具冲突**：两个 MCP 可能提供同名工具（如 `mcp_search`），导致后面的覆盖前面的
3. **用户体验差**：同时显示两个搜索功能，用户不知道选择哪个

### 优化方案
**保留百度千帆，隐藏豆包**（推荐）

**理由**：
- ✅ 百度千帆是官方平台，文档完善
- ✅ 稳定性更好，与国内搜索需求匹配度高
- ✅ 用户已经配置成功并验证可用
- ✅ 避免功能重复和工具冲突

---

## 🔧 实施的优化

### 1. 标记豆包为"即将推出"

**文件**: [resources/mcp-templates.json](d:\wechat-flowwork\resources\mcp-templates.json:32-43)

**修改**:
```json
{
  "doubao-search": {
    "description": "豆包火山引擎 - 豆包扣子 AI 搜索与问答（需要豆包 API Key）",
    "type": "streamableHttp",
    "baseUrl": "https://mcp.coze.cn/v1/plugins/7516843396187766818",
    "headers": {
      "Authorization": "Bearer YOUR_DOUBAO_API_KEY_HERE"
    },
    "disabled": true,
    "_coming_soon": true,  // ✅ 新增：标记为即将推出，UI 中自动隐藏
    "_docs": "获取 API Key: https://www.coze.cn/",
    "_note": "豆包搜索与百度搜索功能重复，建议优先使用百度千帆搜索。如需启用豆包，请将 _coming_soon 设置为 false。"
  }
}
```

### 2. UI 自动过滤机制

**文件**: [src/components/MCPManager.tsx](d:\wechat-flowwork\src\components/MCPManager.tsx:158-163)

**现有代码**（无需修改）:
```typescript
const servers = Object.entries(template.mcpServers || {})
  .filter(([, config]) => {
    // 过滤掉标记为"即将推出"的服务器
    const serverConfig = config as any;
    return !serverConfig._coming_soon;  // ✅ 自动过滤掉 _coming_soon: true 的服务器
  })
  .map(([name, config]) => {
    // ...
  });
```

**效果**:
- ✅ 豆包服务器不会显示在 UI 中
- ✅ 豆包的配置 UI 也不会渲染
- ✅ 用户只看到：文件访问、网页抓取、网络搜索（百度）

---

## 📊 优化前后对比

### 优化前（4 个服务器）
```
✅ 文件访问 (filesystem)
✅ 网页抓取 (fetch)
⚠️ 网络搜索 (baidu-search) - 需要配置
⚠️ 豆包火山引擎 (doubao-search) - 需要配置
```

**问题**:
- ❌ 两个搜索功能，用户不知道选择哪个
- ❌ 同时启用会导致工具冲突
- ❌ UI 混乱，配置复杂

### 优化后（3 个服务器）
```
✅ 文件访问 (filesystem)
✅ 网页抓取 (fetch)
⚠️ 网络搜索 (baidu-search) - 需要配置
```

**优势**:
- ✅ 功能清晰，没有重复
- ✅ UI 简洁，易于配置
- ✅ 避免工具冲突
- ✅ 豆包配置代码保留，需要时可恢复

---

## 🔄 如何恢复豆包（可选）

如果将来需要使用豆包，只需：

### 方法 1: 修改模板文件

编辑 `resources/mcp-templates.json`：

```json
{
  "doubao-search": {
    "_coming_soon": false  // ✅ 改为 false 即可显示
  }
}
```

### 方法 2: 手动添加自定义服务器

在应用中：
1. 进入"**设置 > MCP 扩展**"
2. 点击"**添加自定义服务器**"
3. 填写豆包配置：
   - **名称**: `doubao-search`
   - **类型**: `streamableHttp`
   - **URL**: `https://mcp.coze.cn/v1/plugins/7516843396187766818`
   - **Headers**: `{"Authorization": "Bearer YOUR_API_KEY"}`

---

## 💡 MCP 配置最佳实践

### 1. 避免功能重复

❌ **不推荐**：
```json
{
  "baidu-search": { ... },  // 搜索功能
  "doubao-search": { ... }, // 搜索功能（重复）
  "google-search": { ... }  // 搜索功能（重复）
}
```

✅ **推荐**：
```json
{
  "baidu-search": { ... }   // 只保留一个搜索功能
}
```

### 2. 使用 `_coming_soon` 标记

对于**即将推出**或**不推荐使用**的功能，使用 `_coming_soon: true` 标记：

```json
{
  "future-feature": {
    "description": "即将推出的功能",
    "_coming_soon": true,
    "_note": "此功能正在开发中，敬请期待"
  }
}
```

### 3. 提供清晰的 `_note` 说明

```json
{
  "doubao-search": {
    "_note": "豆包搜索与百度搜索功能重复，建议优先使用百度千帆搜索。如需启用豆包，请将 _coming_soon 设置为 false。"
  }
}
```

---

## ✅ 验证测试

### 测试步骤

1. **启动应用**:
   ```bash
   npm run dev
   ```

2. **检查 MCP 列表**:
   - 进入"**设置 > MCP 扩展**"
   - 确认只显示 **3 个服务器**：
     - ✅ 文件访问
     - ✅ 网页抓取
     - ✅ 网络搜索（百度）
   - 确认**不显示**豆包火山引擎

3. **测试百度搜索**:
   ```
   使用百度搜索：今天的科技新闻
   ```

4. **验证工具调用**:
   - ✅ AI 调用 `baidu-search__mcp_search` 工具
   - ✅ 返回搜索结果
   - ✅ 无工具冲突错误

---

## 📚 相关文档

- [BAIDU_MCP_CONFIG_FIX.md](./BAIDU_MCP_CONFIG_FIX.md) - 百度 MCP 配置修复
- [MCP_USER_TEST_GUIDE.md](./MCP_USER_TEST_GUIDE.md) - 用户测试指南
- [FETCH_MCP_VERIFICATION_REPORT.md](./FETCH_MCP_VERIFICATION_REPORT.md) - Fetch MCP 验证报告

---

## 🎉 总结

### 优化成果

- ✅ **UI 简化**: 从 4 个服务器减少到 3 个
- ✅ **避免冲突**: 移除重复的搜索功能
- ✅ **用户友好**: 配置更清晰，易于理解
- ✅ **保持灵活**: 豆包配置保留，需要时可恢复

### 用户体验提升

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 服务器数量 | 4 个 | 3 个 | -25% |
| 搜索功能 | 2 个（重复） | 1 个 | -50% |
| 工具冲突 | 有 | 无 | ✅ 解决 |
| 配置复杂度 | 中等 | 简单 | ✅ 改善 |

---

**优化人**: Claude (AI Assistant)
**优化时间**: 2026-01-25 21:15
**优化文件**:
- `resources/mcp-templates.json`（标记豆包为 `_coming_soon`）

**下一步**: 用户重启应用，验证优化效果
