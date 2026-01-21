---
name: webapp-testing
description: |
  Web 应用测试工具 - 使用 Playwright 与本地 Web 应用交互和测试的工具包。
  支持验证前端功能、调试 UI 行为、捕获浏览器截图和查看浏览器日志。
  当用户需要：测试 Web 应用、自动化浏览器操作、截图、调试前端时触发此技能。
---

# Web 应用测试

使用原生 Python Playwright 脚本测试本地 Web 应用。

**可用的辅助脚本**：
- `scripts/with_server.py` - 管理服务器生命周期（支持多个服务器）

**始终首先使用 `--help` 运行脚本**以查看用法。在尝试运行脚本之前不要阅读源代码，直到发现绝对需要自定义解决方案。

## 决策树：选择方法

```
用户任务 → 是静态 HTML 吗？
    ├─ 是 → 直接读取 HTML 文件以识别选择器
    │         ├─ 成功 → 使用选择器编写 Playwright 脚本
    │         └─ 失败/不完整 → 视为动态（见下文）
    │
    └─ 否（动态 webapp）→ 服务器已运行？
        ├─ 否 → 运行：python scripts/with_server.py --help
        │        然后使用 helper + 编写简化的 Playwright 脚本
        │
        └─ 是 → 侦察然后行动：
            1. 导航并等待 networkidle
            2. 截图或检查 DOM
            3. 从渲染状态识别选择器
            4. 使用发现的选择器执行操作
```

## 使用 with_server.py 的示例

要启动服务器，首先运行 `--help`，然后使用 helper：

**单个服务器**：
```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_automation.py
```

**多个服务器（例如，后端 + 前端）**：
```bash
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python your_automation.py
```

要创建自动化脚本，仅包含 Playwright 逻辑（服务器自动管理）：
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)  # 始终在 headless 模式启动 chromium
    page = browser.new_page()
    page.goto('http://localhost:5173')  # 服务器已运行并准备就绪
    page.wait_for_load_state('networkidle')  # 关键：等待 JS 执行
    # ... 你的自动化逻辑
    browser.close()
```

## 侦察-然后-行动模式

1. **检查渲染的 DOM**：
   ```python
   page.screenshot(path='/tmp/inspect.png', full_page=True)
   content = page.content()
   page.locator('button').all()
   ```

2. **从检查结果识别选择器**

3. **使用发现的选择器执行操作**

## 常见陷阱

❌ **不要**在等待动态应用的 `networkidle` 之前检查 DOM
✅ **要**在检查之前等待 `page.wait_for_load_state('networkidle')`

## 最佳实践

- **将捆绑的脚本用作黑盒** - 完成任务时，考虑 `scripts/` 中可用的脚本之一是否可以帮忙。这些脚本可靠地处理常见的复杂工作流程，而不会污染上下文窗口。使用 `--help` 查看用法，然后直接调用。
- 使用 `sync_playwright()` 进行同步脚本
- 完成后始终关闭浏览器
- 使用描述性选择器：`text=`、`role=`、CSS 选择器或 ID
- 添加适当的等待：`page.wait_for_selector()` 或 `page.wait_for_timeout()`

## 常见操作

### 导航到页面

```python
page.goto('http://localhost:5173')
page.wait_for_load_state('networkidle')
```

### 查找元素

```python
# 通过文本
button = page.locator('text=提交')

# 通过 CSS 选择器
input = page.locator('#email-input')

# 通过角色
submit_button = page.get_by_role('button', name='提交')

# 多个元素
all_buttons = page.locator('button').all()
```

### 与元素交互

```python
# 点击
button.click()

# 输入文本
input.fill('test@example.com')

# 获取文本
text = element.text_content()

# 获取属性
href = link.get_attribute('href')
```

### 截图

```python
# 整页
page.screenshot(path='screenshot.png', full_page=True)

# 特定元素
element.screenshot(path='element.png')
```

### 等待

```python
# 等待选择器
page.wait_for_selector('.result')

# 等待导航
page.wait_for_load_state('networkidle')

# 等待超时
page.wait_for_timeout(1000)  # 1 秒
```

### JavaScript 执行

```python
# 执行脚本
result = page.evaluate('() => document.title')

# 执行函数
value = page.evaluate('el => el.value', element)
```

### 控制台日志

```python
# 监听控制台消息
messages = []
def on_console(msg):
    messages.append(msg.text)

page.on('console', on_console)

# 触发日志
page.click('button')

# 检查日志
print(messages)
```

## 依赖要求

- **playwright**: `pip install playwright`
- **浏览器**：`playwright install chromium`

## 代码风格指南

**重要**：为 Playwright 操作生成代码时：
- 编写简洁、可读的代码
- 使用描述性变量名
- 添加等待以确保页面加载完成
- 始终关闭浏览器
- 使用适当的错误处理
