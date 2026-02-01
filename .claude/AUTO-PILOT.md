# 🚀 Claude Code 傻瓜包使用指南

## ✅ 已完成配置

### 1. 全局自动化规则
已安装到 `~/.claude/rules/`:
- ✅ `00-auto-detect.md` - 自动意图检测
- ✅ `01-electron-auto.md` - Electron 自动最佳实践
- ✅ `02-workflow-auto.md` - 全自动工作流
- ✅ `security.md` - 安全规则
- ✅ `testing.md` - 测试规则
- ✅ `coding-style.md` - 编码风格
- ✅ `performance.md` - 性能优化
- ✅ 更多...

### 2. 项目级 Hooks
已配置 `.claude/hooks.json`:
- ✅ 自动检测 console.log
- ✅ 自动提醒 TypeScript 检查
- ✅ 自动提醒运行测试
- ✅ 自动检查测试覆盖率
- ✅ 会话结束自动总结

### 3. 项目文档已更新
`CLAUDE.md` 已添加自动化说明:
- ✅ 傻瓜包功能介绍
- ✅ 自动化能力说明
- ✅ 使用示例
- ✅ 技能集成说明

### 4. 已安装插件
- ✅ `everything-claude-code` (v1.2.0)
- ✅ `superpowers` (v4.0.3)
- ✅ `document-skills`
- ✅ `example-skills`
- ✅ `glm-plan-bug` / `glm-plan-usage`

---

## 🎯 如何使用

### 方式一：自然对话（推荐）

直接像和人说话一样对话，系统会自动判断并执行：

```
# 功能开发
"帮我实现用户登录功能"
→ 自动规划 → TDD 实现 → 代码审查 → 文档生成

# Bug 修复
"窗口不显示了"
→ 自动调试 → 根因分析 → 修复验证

# 代码审查
"帮我检查这段代码"
→ 自动审查 → 性能分析 → 安全检查 → 优化建议

# 设计任务
"设计一个设置页面"
→ 自动设计 → 组件实现 → 桌面适配

# 学习询问
"怎么优化 Electron 启动速度？"
→ 自动调用技能 → 提供方案 → 代码示例
```

### 方式二：手动命令（可选）

虽然自动检测已启用，但你仍可手动调用特定命令：

```bash
/plan              # 功能规划
/tdd               # TDD 开发
/code-review       # 代码审查
/build-fix         # 修复构建错误
/e2e               # E2E 测试
/verify            # 运行验证
/skill-create      # 创建技能
/learn             # 提取模式
```

---

## 🔥 核心特性

### 1. 自动意图检测
根据你的输入自动判断任务类型：
- 新功能实现 → 自动规划 + TDD
- Bug 调试 → 系统调试流程
- 代码审查 → 质量检查 + 性能分析
- UI 设计 → 前端设计 + 桌面适配
- 文档写作 → 文档生成 + 格式化

### 2. 自动最佳实践
无需手动指定，自动应用：
- Electron 安全规则（CRITICAL）
- IPC 类型安全（HIGH）
- 性能优化（HIGH）
- TDD 流程（80% 覆盖率）
- 代码质量标准

### 3. 自动事件触发
在特定时机自动执行操作：
- 编辑代码 → 检测 console.log
- 提交前 → 提醒运行检查
- 构建后 → 分析覆盖率
- 会话结束 → 总结工作

### 4. 持续学习
自动从你的项目中学习：
- 提取成功的解决方案
- 生成可复用模式
- 更新技能库
- 防止同类错误

---

## 📊 自动化流程示例

### 示例 1: 实现新功能
```
你: "帮我实现用户认证功能"

AI 自动执行:
  ✅ Phase 1: 需求分析
     - 识别功能类型
     - 启动 planner agent
     - 制定详细计划
     - 等待你的确认

  ✅ Phase 2: TDD 实现
     - 先写测试用例
     - 运行测试（RED）
     - 实现最小功能
     - 运行测试（GREEN）
     - 重构代码

  ✅ Phase 3: 代码审查
     - 使用 code-reviewer agent
     - 检查代码质量
     - 检查安全性
     - 检查性能
     - 生成审查报告

  ✅ Phase 4: 自动优化
     - 应用最佳实践
     - 修复安全问题
     - 优化性能
     - 完善错误处理

  ✅ Phase 5: 文档生成
     - 生成 API 文档
     - 更新使用指南
     - 添加代码示例

  ✅ Phase 6: 提交代码
     - 运行所有检查
     - 生成 commit message
     - 征求确认后提交

全程无需你手动输入任何命令！
```

### 示例 2: 调试 Bug
```
你: "登录后窗口崩溃了"

AI 自动执行:
  ✅ Phase 1: 问题定位
     - 收集错误信息
     - 分析堆栈跟踪
     - 检查日志
     - 重现问题

  ✅ Phase 2: 根因分析
     - 提出假设
     - 验证假设
     - 缩小范围
     - 定位根本原因

  ✅ Phase 3: 解决方案
     - 提出修复方案
     - 实施修复
     - 编写测试
     - 验证修复

  ✅ Phase 4: 防止复发
     - 记录错误日志
     - 提取解决方案模式
     - 更新调试技能
     - 生成预防规则
```

---

## 🎨 技能生态系统

### 已集成的技能

**Electron 相关**:
- `electron-react-best-practices` - 74+ 条最佳实践
- `electron-mcp-best-practices` - MCP 集成指南
- `electron-react-frontend` - UI/UX 规则

**工作流相关**:
- `superpowers:writing-plans` - 功能规划
- `superpowers:systematic-debugging` - 系统调试
- `superpowers:test-driven-development` - TDD 开发
- `superpowers:requesting-code-review` - 代码审查
- `superpowers:dispatching-parallel-agents` - 并行任务

**创作相关**:
- `document-skills:frontend-design` - 前端设计
- `document-skills:skill-creator` - 技能创作
- `document-skills:doc-coauthoring` - 文档协作

**配置合集**:
- `everything-claude-code` - 黑客松获胜者配置
  - 10+ 专业 agents
  - 17+ 斜杠命令
  - 15+ 技能库
  - 6+ 规则文件

---

## ⚙️ 高级定制

### 修改自动检测规则
编辑 `~/.claude/rules/00-auto-detect.md`:
```markdown
### 自定义触发关键词
**触发关键词**:
- "你的关键词" → 自动行为
```

### 修改工作流规则
编辑 `~/.claude/rules/02-workflow-auto.md`:
```markdown
### 自定义工作流
**自动执行序列**:
1. 你的步骤 1
2. 你的步骤 2
3. 你的步骤 3
```

### 修改事件触发器
编辑 `.claude/hooks.json`:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "你的匹配规则",
        "hooks": [{ "type": "command", "command": "你的命令" }]
      }
    ]
  }
}
```

---

## 🔍 故障排查

### Q: 自动化不生效？
A: 检查规则文件是否正确安装：
```bash
ls ~/.claude/rules/
ls .claude/hooks.json
```

### Q: 如何禁用某个自动化？
A: 编辑对应的规则文件，注释掉不需要的部分

### Q: 如何查看当前应用的规则？
A: 查看对话历史，系统会显示触发的规则和技能

### Q: 如何添加新的自动检测？
A: 编辑 `~/.claude/rules/00-auto-detect.md`，添加新的触发条件

---

## 📚 参考资源

### 官方文档
- [Claude Code 文档](https://docs.anthropic.com/claude-code)
- [Everything Claude Code](https://github.com/affaan-m/everything-claude-code)

### 项目特定
- [CLAUDE.md](./CLAUDE.md) - 项目配置
- [README.md](./README.md) - 项目概述

### 技能文档
- `~/.claude/skills/*/SKILL.md` - 所有技能文档

---

## 🎉 开始使用

现在就试试吧！直接说出你的需求，系统会自动处理：

```
"帮我优化应用的启动性能"
"审查一下 IPC 通信的安全性"
"实现一个消息通知功能"
"设计一个设置界面"
```

**享受真正的"傻瓜式"开发体验！** 🚀
