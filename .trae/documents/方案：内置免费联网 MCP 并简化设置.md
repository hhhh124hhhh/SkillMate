# 方案修正：基于 Electron 的无障碍联网搜索

考虑到 DuckDuckGo 在国内无法访问的问题，我将采用**基于 Electron 内置浏览器**的搜索方案。

这个方案利用 OpenCowork 自身的浏览器能力去访问搜索引擎（如必应国内版或百度），**只要您的电脑能打开网页，AI 就能联网搜索**，无需翻墙，也无需任何 API Key。

## 1. 核心变更：Electron 浏览器搜索 (无依赖/国内可用)

*   **技术原理**: 利用 Electron 的隐藏窗口 (`BrowserWindow`) 加载搜索引擎页面，并提取搜索结果。
*   **默认引擎**: **必应国内版 (cn.bing.com)**。它在国内访问稳定，且搜索质量优于百度，适合 AI 阅读。
*   **优势**:
    *   **国内可用**: 完全不依赖墙外服务。
    *   **零配置**: 无需申请 API Key。
    *   **零额外依赖**: 不需要安装 Python 库或 Puppeteer，复用应用本身环境，体积不增加。

## 2. 实施细节

### 实现 `WebSearchProvider`
创建 `electron/agent/mcp/builtin/WebSearchProvider.ts`：
*   **机制**:
    1.  收到搜索请求时，在后台创建一个不可见的 `BrowserWindow`。
    2.  导航至 `https://cn.bing.com/search?q=...`。
    3.  页面加载完成后，执行脚本提取搜索结果的标题、链接和摘要。
    4.  关闭窗口并返回结果给 Agent。
*   **工具定义**:
    *   `internet__web_search`: 联网搜索工具。

### 集成与清理
*   **集成**: 在 `MCPClientService.ts` 中注册这个内置提供者。
*   **清理**: 移除 `SettingsView.tsx` 中的 MCP 设置页，简化用户界面。

## 3. 预期效果
更新后，无论网络环境如何（只要能上网），AI 都可以通过内置浏览器进行联网搜索，获取实时信息。
