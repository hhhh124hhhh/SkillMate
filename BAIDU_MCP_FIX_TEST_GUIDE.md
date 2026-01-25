# 百度千帆 MCP 配置测试指南

## 🎯 修复内容

本次修复解决了 **UI 显示"已启用"但配置未保存** 的问题。

### 问题原因
1. 模板配置中 `baidu-search` 未设置 `disabled` 字段，默认显示为"已启用"
2. 用户点击开关只是切换状态，不检查 API Key 是否有效
3. 配置文件中的 Authorization header 仍是占位符

### 修复方案
1. ✅ **模板配置**：添加 `disabled: true` 默认禁用
2. ✅ **开关保护**：检查 API Key 是否为占位符
3. ✅ **用户提示**：添加明显的警告框和操作指引

---

## 📋 测试步骤

### 1. 重启应用

```bash
npm run dev
```

### 2. 检查初始状态

进入 "设置" > "MCP"，找到 "网络搜索"（百度千帆）

**预期结果**：
- ✅ 开关显示为**关闭**状态（灰色）
- ✅ 显示黄色警告框："⚠️ 需要配置 API Key 才能使用此功能"
- ✅ 下方有 API Key 输入框和"配置并启用"按钮

### 3. 测试开关保护

尝试直接点击开关（不输入 API Key）

**预期结果**：
- ✅ 显示错误提示："⚠️ 请先配置百度千帆 API Key，然后点击'配置并启用'按钮"
- ✅ 开关保持关闭状态

### 4. 配置 API Key

1. 输入您的百度千帆 API Key（格式：`bce-v3/ALTAK-xxxxx`）
2. 点击"配置并启用"按钮

**预期结果**：
- ✅ 按钮显示"配置中..."
- ✅ 配置成功后，开关自动变为**启用**状态（紫色/橙色）
- ✅ 显示"已连接"状态和绿色对勾

### 5. 验证配置文件

打开配置文件检查：

```bash
# Windows
notepad %USERPROFILE%\.aiagent\mcp.json

# 或使用命令
cat ~/.aiagent/mcp.json
```

**预期结果**：
```json
{
  "mcpServers": {
    "baidu-search": {
      "type": "streamableHttp",
      "baseUrl": "https://ai.baidu.com/appbuilder/v2/ai_search/mcp/sse",
      "headers": {
        "Authorization": "Bearer+bce-v3/ALTAK-xxxxx"  // ✅ 实际的 API Key
      },
      "disabled": false  // ✅ 已启用
    }
  }
}
```

### 6. 测试 AI 搜索功能

在聊天中输入：

```
搜索 2026 年人工智能最新进展
```

**预期结果**：
- ✅ AI 调用 `baidu-search__search` 工具
- ✅ 返回实时搜索结果
- ✅ AI 基于搜索结果生成回复

---

## 🔧 故障排查

### 问题 1: 配置未保存

**症状**：点击"配置并启用"后，配置文件仍是占位符

**解决方案**：
1. 检查浏览器控制台（F12）是否有错误
2. 检查主进程终端是否有错误日志
3. 尝试手动配置脚本：
   ```bash
   node scripts/fix-baidu-mcp-config.js "您的API密钥"
   ```

### 问题 2: MCP 服务器未连接

**症状**：UI 显示"未连接"或红色警告

**解决方案**：
1. 检查 API Key 格式是否正确
2. 点击"重试"按钮重新连接
3. 查看状态栏的错误消息

### 问题 3: AI 看不到工具

**症状**：AI 提示"baidu-search 工具还没有配置启用"

**解决方案**：
1. 验证 `~/.aiagent/mcp.json` 中 `disabled: false`
2. 验证 Authorization header 不是占位符
3. 重启应用重新加载 MCP 服务

---

## 📊 修复验证清单

完成以下检查确认修复成功：

- [ ] **初始状态**：百度千帆默认为禁用状态（开关关闭）
- [ ] **开关保护**：直接点击开关显示错误提示
- [ ] **API Key 配置**：输入并点击"配置并启用"成功
- [ ] **配置文件**：`~/.aiagent/mcp.json` 中不再是占位符
- [ ] **UI 状态**：显示"已连接"和绿色对勾
- [ ] **AI 工具**：AI 能够调用 baidu-search 工具
- [ ] **搜索功能**：搜索返回实时结果

---

## 🎉 成功标准

如果以上所有检查都通过，说明修复成功！

**下一步**：
- 使用联网功能进行实时信息检索
- 结合技能系统使用（如 `/wechat-writing`）
- 享受完整的 AI 联网能力

---

**最后更新**: 2026-01-25
**修复版本**: v1.0.1
**相关文档**: [MCP_NETWORKING_FIX_SUMMARY.md](./MCP_NETWORKING_FIX_SUMMARY.md)
