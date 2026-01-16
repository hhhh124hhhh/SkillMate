---
name: 公众号文章获取
description: 根据cookie获取目标公众号的文章列表
---

# 微信公众号文章获取工具

这是一个用于获取微信公众号文章列表的工具，通过公众号昵称和有效的身份凭证来获取文章标题和链接。

## 📌 功能说明

### 核心功能
1. **搜索公众号**：根据公众号昵称搜索并获取其fakeid（唯一标识）
2. **获取文章列表**：根据fakeid获取该公众号发布的历史文章列表

### 工作原理
- 访问微信公众号后台API接口
- 使用cookie和token进行身份验证
- 通过两次请求完成：先获取fakeid，再获取文章列表

## 🔧 技术实现

### 依赖库
```python
requests
```

### API接口
1. **搜索接口**：`https://mp.weixin.qq.com/cgi-bin/searchbiz`
2. **文章接口**：`https://mp.weixin.qq.com/cgi-bin/appmsg`

## 📥 输入参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cookie | string | ✅ | 微信公众号后台的cookie |
| token | string | ✅ | 微信公众号后台的token |
| nickname | string | ✅ | 目标公众号的昵称 |
| begin | int | ❌ | 开始位置，默认0 |
| count | int | ❌ | 获取数量，默认1 |

## 📤 输出格式

```json
{
  "result": [
    {
      "title": "文章标题1",
      "url": "文章链接1"
    },
    {
      "title": "文章标题2",
      "url": "文章链接2"
    }
  ]
}
```

## 🔐 获取Cookie和Token

### 方法一：浏览器开发者工具
1. 登录微信公众平台（mp.weixin.qq.com）
2. 打开浏览器开发者工具（F12）
3. 切换到 Network（网络）标签
4. 刷新页面，找到任意请求
5. 在 Request Headers 中查找：
   - `Cookie:` 后面的一整串内容
   - URL参数中的 `token=` 值

### 方法二：浏览器存储
1. 登录微信公众平台
2. 打开开发者工具 → Application（应用）
3. 左侧找到 Cookies → mp.weixin.qq.com
4. 复制所有cookie内容
5. 在LocalStorage中查找token值

### Cookie示例格式
```
rewardsn=; wxtokenkey=777; wxuin=...; pt2gguin=o...; mm_lang=zh_CN; ...
```

## 💡 使用示例

### 基础使用
```python
from get_wechat_articles import handler

args = {
    "cookie": "你的cookie内容",
    "token": "你的token",
    "nickname": "目标公众号昵称",
    "begin": 0,
    "count": 5
}

result = handler(args)
print(result)
```

### 获取多页文章
```python
# 获取前10篇文章
args = {
    "cookie": "你的cookie",
    "token": "你的token",
    "nickname": "目标公众号",
    "begin": 0,
    "count": 10
}

result = handler(args)
```

### 分批获取
```python
# 第一批：0-9
result1 = handler({
    "cookie": cookie,
    "token": token,
    "nickname": "公众号名",
    "begin": 0,
    "count": 10
})

# 第二批：10-19
result2 = handler({
    "cookie": cookie,
    "token": token,
    "nickname": "公众号名",
    "begin": 10,
    "count": 10
})
```

## 📋 函数说明

### get_fakeid(nickname, begin=0, count=1)
根据公众号昵称获取fakeid

**参数：**
- `nickname`: 公众号昵称
- `begin`: 开始位置
- `count`: 获取数量

**返回：**
- 成功：返回fakeid字符串
- 失败：返回None

**异常：**
- 获取失败时抛出Exception

### get_articles(nickname, fakeid, begin=0, count=1)
获取公众号文章列表

**参数：**
- `nickname`: 公众号昵称
- `fakeid`: 公众号fakeid
- `begin`: 开始位置
- `count`: 获取数量

**返回：**
- 成功：返回文章列表 ["标题: 链接", ...]
- 失败：返回空列表

**异常：**
- 获取失败时抛出Exception

### handler(args)
主处理函数

**参数：**
- `args`: 包含cookie、token、nickname、begin、count的字典

**返回：**
- 包含文章列表的字典
```json
{
  "result": [
    {"title": "标题", "url": "链接"}
  ]
}
```

**异常：**
- 缺少必填参数：ValueError
- 未找到公众号：ValueError

## ⚠️ 注意事项

### 安全提醒
1. **保护敏感信息**：cookie和token是你的身份凭证，请妥善保管
2. **不要公开分享**：不要将cookie和token分享给他人
3. **定期更换**：建议定期更换cookie以确保账号安全
4. **使用后清除**：如果不需要，请及时清理测试数据

### 使用规范
1. **遵守平台规则**：遵守微信公众号使用规范和用户协议
2. **尊重版权**：获取到的文章内容仅供学习研究使用
3. **合理使用**：不要频繁请求，避免给服务器造成压力
4. **合法合规**：确保使用行为符合相关法律法规

### 技术限制
1. **有效期**：cookie和token有一定的有效期，过期需要重新获取
2. **频率限制**：频繁请求可能会触发反爬机制
3. **权限限制**：只能获取到你有权限访问的公众号文章
4. **数据量**：单次请求建议不超过20篇

## 🐛 常见问题

### 1. 获取fakeid失败
**原因：**
- cookie或token无效或过期
- 公众号昵称不正确
- 网络连接问题

**解决方案：**
- 检查cookie和token是否正确
- 确认公众号昵称是否准确
- 重新获取cookie和token

### 2. 获取文章列表为空
**原因：**
- fakeid获取错误
- 公众号没有发布文章
- 请求参数设置不当

**解决方案：**
- 先确认fakeid是否正确
- 检查公众号是否有历史文章
- 调整begin和count参数

### 3. Cookie/Token过期
**原因：**
- 登录状态已过期
- Cookie有效期结束

**解决方案：**
- 重新登录微信公众平台
- 按照上述方法重新获取cookie和token

### 4. 请求被拒绝
**原因：**
- 请求频率过高
- IP被限制
- 账号异常

**解决方案：**
- 降低请求频率
- 检查账号状态
- 等待一段时间后重试

## 📊 应用场景

1. **竞品分析**：获取竞品公众号的文章，分析其内容策略
2. **内容研究**：收集特定领域的优质文章进行学习
3. **数据分析**：批量获取文章数据用于统计分析
4. **文章监控**：监控目标公众号的文章发布情况

## 🛠️ 便捷脚本工具（2026-01-15新增）

除了直接使用 handler 函数，我们还提供了三个便捷脚本，让文章获取更加简单。

### 1. fetch_wechat_articles.py - 通用文章获取工具 ⭐

**位置**：项目根目录 `fetch_wechat_articles.py`

**功能**：获取任意微信公众号的文章列表，支持多种使用方式

**使用方式**：

#### 方式一：交互模式（最简单）
```bash
python fetch_wechat_articles.py
```
然后按提示输入公众号名称、Cookie、Token即可

#### 方式二：命令行模式（推荐）
```bash
# 基本用法
python fetch_wechat_articles.py "小郝AI说" --cookie "你的Cookie" --token "你的Token"

# 指定获取文章数
python fetch_wechat_articles.py "财职数字充电站" --cookie "你的Cookie" --token "你的Token" --max 50

# 自定义输出文件名
python fetch_wechat_articles.py "小郝AI说" --cookie "你的Cookie" --token "你的Token" --output "my_articles.json"

# 静默模式（不显示详细进度）
python fetch_wechat_articles.py "小郝AI说" --cookie "你的Cookie" --token "你的Token" --quiet
```

#### 方式三：批量模式（高级）
```bash
# 创建 accounts.txt 文件，每行一个公众号名称
echo "小郝AI说" > accounts.txt
echo "财职数字充电站" >> accounts.txt

# 批量获取
python fetch_wechat_articles.py --batch accounts.txt --cookie "你的Cookie" --token "你的Token"
```

**特点**：
- ✅ 支持交互模式，无需记命令
- ✅ 支持命令行模式，适合脚本化
- ✅ 支持批量模式，一次获取多个公众号
- ✅ 自动保存到 `公众号项目/<公众号名称>/` 目录
- ✅ 详细的使用指南：`fetch_wechat_articles_使用指南.md`

---

### 2. fetch_chuanzhang_articles.py - 专用获取脚本

**位置**：项目根目录 `fetch_chuanzhang_articles.py`

**功能**：专门用于获取"船长AI视界"公众号的文章

**使用方式**：
```bash
# 1. 修改脚本中的配置
TARGET_ACCOUNT = "船长AI视界"  # 可以改为其他公众号
COOKIE = "你的Cookie"
TOKEN = "你的Token"

# 2. 运行脚本
python fetch_chuanzhang_articles.py
```

**特点**：
- ✅ 配置简单，只需修改脚本顶部的配置
- ✅ 自动获取最多100篇文章
- ✅ 自动保存到 `公众号项目/船长AI视界/` 目录

---

### 3. 脚本对比

| 特性 | fetch_wechat_articles.py | fetch_chuanzhang_articles.py |
|------|--------------------------|------------------------------|
| **适用范围** | 任意公众号 | 特定公众号（可修改配置） |
| **使用方式** | 命令行参数 | 修改脚本配置 |
| **灵活性** | ⭐⭐⭐⭐⭐ 非常灵活 | ⭐⭐⭐ 较灵活 |
| **易用性** | ⭐⭐⭐⭐ 交互模式简单 | ⭐⭐⭐⭐⭐ 最简单 |
| **批量操作** | ✅ 支持批量模式 | ❌ 需要手动修改 |
| **推荐场景** | 经常使用、批量获取 | 快速获取、一次性使用 |

**推荐使用**：
- 新手用户：`fetch_chuanzhang_articles.py`（配置简单）
- 日常使用：`fetch_wechat_articles.py`（交互模式）
- 批量操作：`fetch_wechat_articles.py --batch`（批量模式）

---

## 🔗 相关资源

- 微信公众平台：https://mp.weixin.qq.com
- 公众号运营规范：https://mp.weixin.qq.com/cgi-bin/opshowpage

## 📝 更新日志

### v1.0.0 (2025-01-10)
- 初始版本发布
- 支持根据昵称获取fakeid
- 支持获取公众号文章列表
- 完善错误处理机制

---

**使用本工具时，请务必遵守相关法律法规和平台规则，确保合法合规使用！**
