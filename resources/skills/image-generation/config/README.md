# 配置文件使用说明

## 📝 配置文件说明

项目使用**模板文件**机制，防止真实API密钥被上传到Git。

- **模板文件**：`config.template.yaml` - 可以安全上传到Git ✅
- **真实配置**：`config.yaml` - 包含真实API密钥，已加入.gitignore ❌

## 🔧 快速配置

### 第一步：从模板创建配置文件

```bash
# 在配置文件目录执行
cd .claude/skills/image-generation/config
cp config.template.yaml config.yaml
```

或者在Windows上：
```cmd
copy .claude\skills\image-generation\config\config.template.yaml .claude\skills\image-generation\config\config.yaml
```

### 第二步：填入真实API密钥

编辑刚创建的 `config.yaml` 文件：

```yaml
api:
  # 将这一行：
  api_key: "在此处填入你的豆包API密钥"

  # 改为：
  api_key: "你的实际豆包API密钥"
```

### 第三步：完成！

现在可以正常使用了，系统会自动读取 `config.yaml` 中的配置。

## 📋 配置优先级

系统会按以下顺序查找API密钥：

1. **命令行参数** `--api-key`（最高优先级）
2. **配置文件** `config.yaml`
3. **环境变量** `DOUBAO_API_KEY`（最低优先级）

## 🔑 其他配置方式（可选）

### 方式2：使用环境变量

```bash
# Linux/Mac
export DOUBAO_API_KEY="你的API密钥"

# Windows (CMD)
set DOUBAO_API_KEY=你的API密钥

# Windows (PowerShell)
$env:DOUBAO_API_KEY="你的API密钥"
```

### 方式3：命令行参数

```bash
python cover_generator.py --api-key "你的API密钥" --use-style --title "标题"
```

## 🔧 获取API密钥

1. 访问[火山引擎控制台](https://console.volcengine.com/ark)
2. 创建应用或选择已有应用
3. 在应用详情页面获取API Key
4. 确保账户有足够的调用额度

## ⚙️ 可选配置项

在 `config.yaml` 中还可以设置：

```yaml
generation:
  quality: "hd"           # 图片质量：standard | hd
  crop_mode: "smart"      # 裁剪模式：center | golden_ratio | smart | all
  generate_share_card: true   # 是否生成分享卡片
  generate_variants: true     # 是否生成多种裁剪方案
```

## 📖 使用示例

配置好API密钥后：

```bash
# 使用风格系统生成封面
python .claude/skills/cover-generator/scripts/cover_generator.py \
  --use-style \
  --title "3个选题焦虑，Claude Skills帮你解决！" \
  --subtitle "AI工具助力创作者" \
  --style tech
```

不需要每次都输入API密钥！

## 🔒 安全说明

### ✅ 已保护

- `config.yaml` 已加入 `.gitignore`，不会被上传
- 只有模板文件 `config.template.yaml` 会上传
- 模板文件不包含任何真实密钥

### ⚠️ 注意事项

1. **不要**手动将 `config.yaml` 添加到Git
2. **不要**在公开场合分享你的API密钥
3. **定期**更换API密钥以确保安全
4. 如果不小心提交了包含密钥的文件，立即：
   - 撤销提交
   - 更换API密钥
   - 从历史记录中彻底删除

## 🐛 故障排查

### 问题：未找到API密钥

**错误信息**：
```
未找到API密钥！请通过以下方式之一配置：
1. 在配置文件中设置...
```

**解决方法**：
1. 确认已从模板创建 `config.yaml`
2. 确认API密钥已正确填写（不是占位符）
3. 确认文件路径正确
4. 检查YAML语法是否正确

### 问题：配置文件不生效

**可能原因**：
1. `config.yaml` 文件不存在
2. YAML格式错误
3. API密钥仍是占位符文本

**检查方法**：
```bash
# 查看配置文件内容
type .claude\skills\image-generation\config\config.yaml

# 确认不是模板文件（Windows）
findstr "在此处填入" .claude\skills\image-generation\config\config.yaml
# 如果有输出，说明还没填入真实密钥
```

### 问题：401 Unauthorized

**错误信息**：
```
401 Client Error: Unauthorized
```

**解决方法**：
1. 确认API密钥是否正确
2. 确认账户是否有足够额度
3. 确认API密钥已激活
4. 检查API密钥是否前后有空格

## 📁 文件结构

```
.claude/skills/image-generation/config/
├── config.template.yaml    # 模板文件（可上传）✅
├── config.yaml            # 真实配置（不上传）❌
└── README.md              # 本说明文档
```

## 💡 提示

- 第一次使用需要先复制模板并填入API密钥
- 之后就可以直接使用，不需要每次都配置
- 配置文件已加入.gitignore，不会被误上传
- 可以随时修改配置文件中的其他参数

---

**如有问题，请查看完整文档或提交Issue。**
