---
name: using-git-worktrees
description: |
  Git 工作树管理 - 在开始需要隔离的功能工作时使用此技能，为功能分支创建独立的 git 工作树。
  提供智能目录选择和安全验证。当用户需要：隔离功能开发、并行工作多个分支、保持工作区整洁时触发此技能。
---

# 使用 Git 工作树进行隔离开发

## 概述

Git worktree 允许你同时检出多个分支到不同目录，无需切换分支或 stash 未提交的更改。

**核心原则**：为每个功能分支创建隔离的工作树，保持开发环境整洁。

**开始时声明**："我正在使用 using-git-worktrees 技能为功能创建隔离的工作空间。"

## 何时使用

**总是使用**，当你需要：
- 在未完成的分支上开始新功能
- 并行处理多个功能分支
- 保持主工作目录整洁
- 在隔离环境中测试集成
- 避免频繁的分支切换和 stash

**特别在以下情况下使用**：
- 开始实现计划（由 brainstorming 生成）
- 需要审查或测试另一个分支
- 想在不 stash 的情况下切换上下文

## 基本用法

### 创建新工作树

```bash
# 为功能分支创建新工作树
git worktree add <path> <branch>

# 示例
git worktree add ../my-project-feature-a feature-a
```

**路径选择策略**：
1. **首选**：父目录 + 项目名 + 分支名
   - 优点：清晰的组织结构
   - 示例：`../my-project-feature-a`

2. **备选**：临时目录 + 分支名
   - 优点：完全隔离
   - 示例：`~/temp/feature-a`

### 列出工作树

```bash
# 查看所有工作树
git worktree list

# 输出示例
# /path/to/main-project              1234abcd [main]
# /path/to/my-project-feature-a      5678efgh [feature-a]
# /path/to/my-project-feature-b      9012ijkl [feature-b]
```

### 删除工作树

```bash
# 删除工作树
git worktree remove <path>

# 或先删除目录，再清理
rm -rf <path>
git worktree prune
```

## 工作流程

### 1. 开始功能开发

**使用 brainstorming 技能后**：

```bash
# 1. 创建新工作树
git worktree add ../my-project-new-feature new-feature

# 2. 进入新工作树
cd ../my-project-new-feature

# 3. 在新工作树中实现功能
# （使用 writing-plans 和 executing-plans）
```

### 2. 并行处理多个功能

```bash
# 主工作目录：实现功能 A
cd ~/projects/my-project-main  # [main]

# 工作树 1：实现功能 B
cd ~/projects/my-project-feature-b  # [feature-b]

# 工作树 2：修复紧急 bug
cd ~/projects/my-project-hotfix  # [hotfix-123]
```

**优势**：
- 无需 stash 或 commit
- 快速在分支间切换
- 每个工作树独立的构建状态

### 3. 完成功能后清理

使用 **finishing-a-development-branch** 技能：
- 合并或创建 PR
- 清理工作树

## 安全检查

### 创建前验证

```bash
# 检查路径是否已存在
ls <path> 2>/dev/null && echo "Path exists" || echo "Path available"

# 检查分支是否已存在
git branch | grep <branch-name> && echo "Branch exists" || echo "New branch"
```

### 创建后验证

```bash
# 验证工作树创建成功
git worktree list | grep <branch-name>

# 进入目录并检查分支
cd <path>
git branch --show-current  # 应该显示 <branch-name>
git status  # 应该是干净的状态
```

## 最佳实践

### 命名约定

**工作树目录**：
- 格式：`<project-name>-<branch-name>`
- 示例：
  - `myproject-feature-user-auth`
  - `myproject-bugfix-login-crash`
  - `myproject-refactor-api`

**分支名称**：
- 使用清晰、描述性的名称
- 遵循项目的分支命名约定
- 示例：`feature/`, `bugfix/`, `hotfix/`

### 路径管理

**推荐结构**：
```
~/projects/
├── myproject/           # 主工作目录 [main]
├── myproject-feature-a/ # 工作树 [feature-a]
└── myproject-bugfix-b/  # 工作树 [bugfix-b]
```

**临时工作树**：
```
~/temp/
└── myproject-experiment/  # 实验性功能
```

### 与其他技能的集成

**使用场景**：
1. **brainstorming** → 创建实施计划
2. **using-git-worktrees** → 为计划创建隔离环境
3. **writing-plans** → 在工作树中编写详细计划
4. **executing-plans** 或 **subagent-driven-development** → 实施功能
5. **finishing-a-development-branch** → 完成并清理工作树

## 常见陷阱

**避免**：
- ❌ 在工作树中使用 `git checkout` 切换分支
  - **问题**：破坏工作树的目的
  - **解决**：使用主工作目录或创建新工作树

- ❌ 忘记清理已完成的工作树
  - **问题**：磁盘空间浪费，目录混乱
  - **解决**：功能完成后立即清理

- ❌ 在多个工作树中修改同一文件
  - **问题**：合并冲突难以解决
  - **解决**：确保功能职责清晰分离

**推荐做法**：
- ✅ 为每个功能创建独立工作树
- ✅ 完成后立即清理工作树
- ✅ 使用清晰的命名约定
- ✅ 定期运行 `git worktree prune`

## 故障排查

### 工作树无法删除

```bash
# 强制删除
git worktree remove --force <path>

# 或手动清理
rm -rf <path>
git worktree prune
```

### 工作树显示为 "detached"

**原因**：检出到特定 commit 而非分支

**解决**：
```bash
# 在工作树中创建新分支
git checkout -b <new-branch>
```

### 工作树路径损坏

```bash
# 清理损坏的工作树
git worktree prune
git worktree repair
```

## 快速参考

| 操作 | 命令 |
|------|------|
| 创建工作树 | `git worktree add <path> <branch>` |
| 列出工作树 | `git worktree list` |
| 删除工作树 | `git worktree remove <path>` |
| 清理元数据 | `git worktree prune` |
| 修复工作树 | `git worktree repair` |

## 依赖要求

- **git**: 版本 2.5+ （worktree 功能）
- 无需额外依赖

## 示例工作流程

```bash
# 1. 主工作目录中规划功能
cd ~/projects/myproject
# 使用 brainstorming 技能...

# 2. 创建隔离工作树
git worktree add ../myproject-user-auth feature/user-auth

# 3. 在工作树中实施
cd ../myproject-user-auth
# 使用 writing-plans 和 executing-plans...

# 4. 完成后清理
cd ~/projects/myproject
git merge feature/user-auth
git worktree remove ../myproject-user-auth
```

## 关键原则

- **隔离优先**：每个功能一个工作树
- **清晰命名**：目录和分支名称应清晰描述功能
- **及时清理**：完成后立即删除工作树
- **并行安全**：避免在同一文件的多个工作树中工作
