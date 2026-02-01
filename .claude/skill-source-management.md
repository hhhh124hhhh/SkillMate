# 技能来源标记和更新管理指南

## 📌 标记技能来源

在技能的 SKILL.md frontmatter 中添加 `source` 字段，标识技能来源。

### 自写技能

```yaml
---
name: my-skill
title: 我的技能
description: 技能描述
source: internal
---
```

**特点**：
- ✅ 适用自动学习机制
- ✅ 错误经验会自动写入技能
- ✅ 可以自由修改和扩展

### 下载技能

```yaml
---
name: external-skill
title: 外部技能
description: 技能描述
source: external
original_url: https://github.com/user/repo
original_version: 1.0.0
---
```

**特点**：
- ✅ 不适用自动学习机制（避免覆盖原作者更新）
- ✅ 提供更新检测和合并机制
- ✅ 保留本地修改（如配置调整）

## 🔧 更新机制

### 检测更新

对于标记为 `source: external` 的技能：

```bash
# 检查更新
cd resources/skills/external-skill
git fetch origin
git log HEAD..origin/main --oneline

# 对比版本
git diff HEAD origin/main -- SKILL.md
```

### 合并更新

```bash
# 保留本地修改
git stash

# 拉取上游更新
git pull origin main

# 恢复本地修改
git stash pop

# 解决冲突
# 编辑冲突文件，保留本地修改的同时合并上游更新
```

### 更新记录

在 SKILL.md 中记录更新历史：

```yaml
---
update_history:
  - version: 1.0.0
    date: 2026-01-31
    changes: 初始下载
  - version: 1.1.0
    date: 2026-02-15
    changes: 合并上游更新，保留本地配置调整
---
```

## 📝 最佳实践

1. **下载新技能时**：
   - 立即标记 `source: external`
   - 记录原始来源和版本
   - 创建本地备份分支

2. **修改外部技能时**：
   - 在单独的分支上修改
   - 保留上游更新能力
   - 记录所有本地修改

3. **更新外部技能时**：
   - 先stash本地修改
   - 合并上游更新
   - 恢复本地修改并解决冲突

## 🔍 验证脚本

```bash
# 检查所有技能的来源标记
find resources/skills -name "SKILL.md" -exec grep -H "source:" {} \; | sort

# 检查未标记的技能
find resources/skills -name "SKILL.md" -exec sh -c 'grep -L "source:" "$1" || echo "$1"' {} \;
```

---

**版本**: 1.0
**创建时间**: 2026-01-31
**用途**: 技能来源标记和更新管理
