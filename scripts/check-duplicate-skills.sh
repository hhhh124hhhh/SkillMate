#!/bin/bash
# 检查技能重复的脚本

echo "🔍 检查技能重复..."
echo ""

# 项目技能目录
PROJECT_SKILLS="resources/skills"
# 用户技能目录
USER_SKILLS="$HOME/.aiagent/skills"

# 临时文件
PROJECT_NAMES=$(mktemp)
USER_NAMES=$(mktemp)
ALL_NAMES=$(mktemp)

# 提取项目技能名称
echo "📁 项目技能 ($PROJECT_SKILLS):"
if [ -d "$PROJECT_SKILLS" ]; then
    while IFS= read -r file; do
        dir=$(dirname "$file")
        skill_id=$(basename "$dir")
        name=$(grep "^name:" "$file" | head -1 | sed 's/name:\s*//' | tr -d '\r')
        echo "$skill_id|$name" | tee -a "$PROJECT_NAMES" | tee -a "$ALL_NAMES"
    done < <(find "$PROJECT_SKILLS" -name "SKILL.md")
else
    echo "  (不存在)"
fi
echo ""

# 提取用户技能名称
echo "📁 用户技能 ($USER_SKILLS):"
if [ -d "$USER_SKILLS" ]; then
    while IFS= read -r file; do
        dir=$(dirname "$file")
        skill_id=$(basename "$dir")
        name=$(grep "^name:" "$file" | head -1 | sed 's/name:\s*//' | tr -d '\r')
        echo "$skill_id|$name" | tee -a "$USER_NAMES" | tee -a "$ALL_NAMES"
    done < <(find "$USER_SKILLS" -name "SKILL.md")
else
    echo "  (不存在)"
fi
echo ""

# 检查重复
echo "🔍 检查重复的技能 ID:"
echo ""

# 按技能 ID 分组并统计
cut -d'|' -f1 "$ALL_NAMES" | sort | uniq -d | while read -r skill_id; do
    echo "⚠️  重复的技能 ID: $skill_id"
    grep "^$skill_id|" "$ALL_NAMES" | while IFS='|' read -r id name; do
        if grep -q "^$id|" "$PROJECT_NAMES"; then
            echo "  - 📦 项目: $id ($name)"
        fi
        if grep -q "^$id|" "$USER_NAMES"; then
            echo "  - 👤 用户: $id ($name)"
        fi
    done
    echo ""
done

# 检查重复的技能名称
echo "🔍 检查重复的技能名称:"
echo ""
cut -d'|' -f2 "$ALL_NAMES" | sort | uniq -d | while read -r name; do
    echo "⚠️  重复的技能名称: $name"
    grep "|$name$" "$ALL_NAMES" | while IFS='|' read -r id skill_name; do
        if grep -q "^$id|" "$PROJECT_NAMES"; then
            echo "  - 📦 项目: $id"
        fi
        if grep -q "^$id|" "$USER_NAMES"; then
            echo "  - 👤 用户: $id"
        fi
    done
    echo ""
done

# 清理
rm -f "$PROJECT_NAMES" "$USER_NAMES" "$ALL_NAMES"

echo "✅ 检查完成"
