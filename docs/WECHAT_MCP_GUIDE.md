# 微信公众号文章抓取 MCP 使用指南

## ✅ 安装完成

您已成功安装 **crawl-mcp-server@1.1.0** MCP 服务器！

## 🎯 功能特性

- ✅ **真正的图片下载**：图片本地化保存，离线可用
- ✅ **支持懒加载**：自动处理微信公众号的懒加载图片
- ✅ **批量抓取**：支持一次抓取多篇文章
- ✅ **智能策略**：fast / basic / conservative 三种抓取策略
- ✅ **多种格式**：支持 Markdown、JSON、HTML 输出

## 🚀 如何使用

### 方法 1：在应用中通过 AI 助手使用

**重启应用后，您可以直接与 AI 对话**：

```
用户：请抓取这篇微信公众号文章 https://mp.weixin.qq.com/s/xxxxxxxx

AI：[会自动调用 crawl_wechat_article 工具为您抓取]
```

### 方法 2：批量抓取多篇文章

```
用户：请批量抓取这些文章：
1. https://mp.weixin.qq.com/s/xxx1
2. https://mp.weixin.qq.com/s/xxx2
3. https://mp.weixin.qq.com/s/xxx3

AI：[会自动调用 crawl_wechat_batch 工具批量抓取]
```

## 🛠️ MCP 工具参数

### crawl_wechat_article（单篇抓取）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| url | string | ✅ | 微信公众号文章的完整 URL |
| outputFormat | string | ❌ | 输出格式：`markdown` / `json` / `html`（默认：markdown） |
| strategy | string | ❌ | 抓取策略：`fast` / `basic` / `conservative`（默认：basic） |
| includeImages | boolean | ❌ | 是否包含图片（默认：true） |

**示例**：
```json
{
  "url": "https://mp.weixin.qq.com/s/example123",
  "outputFormat": "markdown",
  "strategy": "basic",
  "includeImages": true
}
```

### crawl_wechat_batch（批量抓取）

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| urls | array | ✅ | 文章链接数组 |
| outputFormat | string | ❌ | 输出格式（默认：markdown） |
| strategy | string | ❌ | 抓取策略（默认：basic） |
| maxConcurrent | number | ❌ | 最大并发数（默认：3） |

**示例**：
```json
{
  "urls": [
    "https://mp.weixin.qq.com/s/example1",
    "https://mp.weixin.qq.com/s/example2"
  ],
  "outputFormat": "markdown",
  "maxConcurrent": 2
}
```

## 📊 抓取策略对比

| 策略 | 速度 | 稳定性 | 适用场景 |
|------|------|--------|----------|
| **fast** | ⚡ 最快 | 🔸 一般 | 网络良好，页面简单 |
| **basic** | 🚀 中等 | ⭐ 平衡 | **大多数情况（推荐）** |
| **conservative** | 🐌 较慢 | 💎 最稳定 | 网络不稳定，复杂页面 |

## 🎨 输出格式说明

### Markdown 格式（推荐）
- ✅ 完整的文章内容
- ✅ 图片本地化路径
- ✅ 保留标题、作者、发布时间
- ✅ 离线可用

### JSON 格式
- 结构化数据
- 包含元数据（作者、发布时间等）
- 适合程序处理

### HTML 格式
- 完整的网页结构
- 保留原始样式
- 适合浏览器查看

## 📝 使用示例

### 示例 1：基础抓取

**对话**：
```
用户：帮我把这篇公众号文章抓取下来 https://mp.weixin.qq.com/s/example

AI：好的，我来为您抓取这篇文章...
[调用 crawl_wechat_article 工具]
抓取完成！文章已保存为 Markdown 格式，图片已下载到本地。
```

### 示例 2：快速抓取（网络良好时）

**对话**：
```
用户：快速抓取这篇文章 https://mp.weixin.qq.com/s/example

AI：好的，使用 fast 策略为您快速抓取...
[调用 crawl_wechat_article，strategy: "fast"]
抓取完成！
```

### 示例 3：保守抓取（网络不稳定时）

**对话**：
```
用户：网络不太好，用保守策略抓取 https://mp.weixin.qq.com/s/example

AI：明白，使用 conservative 策略确保稳定性...
[调用 crawl_wechat_article，strategy: "conservative"]
抓取完成！虽然慢一点，但内容完整可靠。
```

### 示例 4：批量抓取

**对话**：
```
用户：帮我批量抓取这几篇文章：
1. https://mp.weixin.qq.com/s/xxx1
2. https://mp.weixin.qq.com/s/xxx2
3. https://mp.weixin.qq.com/s/xxx3

AI：好的，开始批量抓取 3 篇文章...
[调用 crawl_wechat_batch]
全部完成！3 篇文章已保存。
```

## 🔧 故障排除

### 问题 1：工具未显示

**原因**：应用未重启，MCP 配置未加载

**解决**：
1. 完全关闭应用
2. 重新启动应用
3. 查看启动日志确认 crawl-wechat MCP 已连接

### 问题 2：抓取失败

**可能原因**：
- 文章链接无效
- 网络连接问题
- 文章已删除或设为私密

**解决**：
- 检查链接是否正确
- 尝试更换抓取策略（改用 conservative）
- 检查网络连接

### 问题 3：图片未下载

**原因**：图片链接失效或网络问题

**解决**：
- 检查 includeImages 参数是否为 true
- 查看错误日志了解具体原因
- 尝试重新抓取

### 问题 4：抓取速度慢

**原因**：使用了 conservative 策略或网络较慢

**解决**：
- 网络良好时使用 fast 或 basic 策略
- 减少批量抓取的并发数

## 📂 输出文件位置

抓取的内容会保存在：
- **Markdown**：`wechat_article_<timestamp>.md`
- **JSON**：`wechat_article_<timestamp>.json`
- **HTML**：`wechat_article_<timestamp>.html`
- **图片**：与文档同级的 `images/` 文件夹

## 🎯 最佳实践

1. **推荐使用 basic 策略**：平衡速度和稳定性
2. **网络良好时用 fast**：快速抓取简单页面
3. **网络不稳定时用 conservative**：确保内容完整
4. **批量抓取控制并发数**：建议不超过 3
5. **定期清理输出文件**：避免占用过多磁盘空间

## 📞 获取帮助

如果遇到问题：
1. 查看应用日志了解详细错误信息
2. 尝试更换抓取策略
3. 检查网络连接和文章链接有效性
4. 参考 [GitHub 项目](https://github.com/wutongci/crawl-mcp) 了解更多信息

---

**版本**：crawl-mcp-server@1.1.0
**安装日期**：2025-01-16
**配置文件**：`F:\person\3-数字化集锦\wechatflowwork\mcp.json`
