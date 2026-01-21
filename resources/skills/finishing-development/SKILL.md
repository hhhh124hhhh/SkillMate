---
name: finishing-development
description: |
  完成开发分支 - 当实施完成、所有测试通过，需要决定如何集成工作时使用此技能。
  引导完成开发工作，提供结构化选项（合并、PR、清理）。当用户需要：合并代码、创建 PR、完成功能时触发此技能。
---

# 完成开发分支

## 概述

引导完成开发工作，提供清晰的选项和处理选定的工作流程。

**核心原则**：验证测试 → 展示选项 → 执行选择 → 清理。

**开始时声明**："我正在使用 finishing-development 技能完成此工作。"

## 流程

### 步骤 1：验证测试

**展示选项前，验证测试通过**：

```bash
# 运行项目测试套件
npm test / cargo test / pytest / go test ./...
```

**如果测试失败**：
```
测试失败（<N> 个失败）。必须在完成前修复：

[显示失败]

在测试通过前无法继续合并/PR。
```

停止。不要继续到步骤 2。

**如果测试通过**：继续到步骤 2。

### 步骤 2：确定基础分支

```bash
# 尝试常见基础分支
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

或询问："此分支从 main 分出 - 这正确吗？"

### 步骤 3：展示选项

准确展示这 4 个选项：

```
实施完成。你想做什么？

1. 本地合并回 <base-branch>
2. 推送并创建 Pull Request
3. 保持分支原样（我稍后处理）
4. 丢弃此工作

哪个选项？
```

**不要添加解释** - 保持选项简洁。

### 步骤 4：执行选择

#### 选项 1：本地合并

```bash
# 切换到基础分支
git checkout <base-branch>

# 拉取最新
git pull

# 合并功能分支
git merge <feature-branch>

# 验证合并结果的测试
<test command>

# 如果测试通过
git branch -d <feature-branch>
```

然后：清理工作树（步骤 5）

#### 选项 2：推送并创建 PR

```bash
# 推送分支
git push -u origin <feature-branch>

# 创建 PR
gh pr create --title "<title>" --body "$(cat <<'EOF'
## 概要
<2-3 个要点描述更改>

## 测试计划
- [ ] <验证步骤>
EOF
)"
```

然后：清理工作树（步骤 5）

#### 选项 3：保持原样

报告："保持分支 <name>。工作树保留在 <path>。"

**不要清理工作树。**

#### 选项 4：丢弃

**先确认**：
```
这将永久删除：
- 分支 <name>
- 所有提交：<commit-list>
- <path> 的工作树

输入 'discard' 确认。
```

等待精确确认。

如果确认：
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

然后：清理工作树（步骤 5）

### 步骤 5：清理工作树

**对于选项 1、2、4**：

检查是否在工作树中：
```bash
git worktree list | grep $(git branch --show-current)
```

如果是：
```bash
git worktree remove <worktree-path>
```

**对于选项 3**：保持工作树。

## 快速参考

| 选项 | 合并 | 推送 | 保持工作树 | 清理分支 |
|------|------|------|-----------|----------|
| 1. 本地合并 | ✓ | - | - | ✓ |
| 2. 创建 PR | - | ✓ | ✓ | - |
| 3. 保持原样 | - | - | ✓ | - |
| 4. 丢弃 | - | - | - | ✓ (force) |

## 常见错误

**跳过测试验证**
- **问题**：合并错误代码，创建失败 PR
- **修复**：展示选项前始终验证测试

**开放性问题**
- **问题**："下一步做什么？" → 模糊
- **修复**：准确展示 4 个结构化选项

**自动清理工作树**
- **问题**：删除可能需要的工作树（选项 2、3）
- **修复**：仅对选项 1 和 4 清理工作树

**丢弃无需确认**
- **问题**：意外删除工作
- **修复**：要求输入 "discard" 确认

## 红旗 - 停止

**绝不**：
- 在测试失败时继续
- 在结果上不验证测试就合并
- 无确认删除工作
- 无明确请求时强制推送

**始终**：
- 展示选项前验证测试
- 准确展示 4 个选项
- 对选项 4 获取输入确认
- 仅对选项 1 & 4 清理工作树

## 集成

**被调用于**：
- **subagent-driven-development**（步骤 7）- 所有任务完成后
- **executing-plans**（步骤 5）- 所有批次完成后

**配合使用**：
- **using-git-worktrees** - 清理该技能创建的工作树

## 依赖要求

- git 2.0+
- gh CLI（用于选项 2 创建 PR）
- 项目测试套件

## 示例场景

### 场景 1：完成功能并创建 PR

```bash
# 1. 验证测试
npm test
# 输出：All tests passed (23/23)

# 2. 确定基础分支
git merge-base HEAD main
# 输出：<commit-hash>

# 3. 展示选项
# 实施 complete。你想做什么？
# 1. 本地合并回 main
# 2. 推送并创建 Pull Request
# 3. 保持分支原样
# 4. 丢弃此工作
# 用户选择：2

# 4. 执行选项 2
git push -u origin feature-user-auth
gh pr create --title "feat: user authentication" --body "..."
git worktree remove ../myproject-user-auth
```

### 场景 2：本地合并并清理

```bash
# 1. 验证测试
pytest
# 输出：15 passed

# 2. 本地合并
git checkout main
git pull
git merge feature-refactor
pytest
# 输出：15 passed
git branch -d feature-refactor
git worktree remove ../myproject-refactor
```

### 场景 3：保留工作继续

```bash
# 用户选择选项 3
# 报告：保持分支 feature-experiment。
# 工作树保留在 ~/projects/myproject-experiment。
# 不清理工作树。
```

## 关键原则

- **测试优先**：测试失败时绝不展示选项
- **明确选项**：准确展示 4 个选项，无歧义
- **确认丢弃**：选项 4 需要输入确认
- **选择性清理**：仅对选项 1 & 4 清理工作树
- **完整验证**：合并前验证合并结果的测试
