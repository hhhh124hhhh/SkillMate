---
name: writing-plans
description: |
  编写战略文档 - 为多步骤任务编写全面的实施计划。
  在开始编码前创建详细的设计文档。当用户需要：规划功能、编写实施计划、设计架构时触发此技能。
---

# 编写战略文档

## 概述

编写全面的实施计划，假设工程师对代码库零上下文。

**核心原则**：文档化实施所需的一切信息。

**开始时声明**："我正在使用 writing-plans 技能创建实施计划。"

**上下文**：应在专用工作树中运行（由 brainstorming 技能创建）。

**保存位置**：`docs/plans/YYYY-MM-DD-<feature-name>.md`

## 任务粒度

**每个步骤一个操作（2-5 分钟）**：
- "编写失败测试" - 步骤
- "运行测试验证失败" - 步骤
- "编写最小代码通过测试" - 步骤
- "运行测试验证通过" - 步骤
- "提交" - 步骤

## 计划文档头部

**每个计划必须以此头部开始**：

```markdown
# [功能名称] 实施计划

> **对于 Claude**：必需子技能：使用 superpowers:executing-plans 逐步实施此计划。

**目标**：[一句话描述此计划构建的内容]

**架构**：[2-3 句话说明方法]

**技术栈**：[关键技术/库]

---
```

## 任务结构

```markdown
### 任务 N：[组件名称]

**文件**：
- 创建：`exact/path/to/file.py`
- 修改：`exact/path/to/existing.py:123-145`
- 测试：`tests/exact/path/to/test.py`

**步骤 1：编写失败测试**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**步骤 2：运行测试验证失败**

运行：`pytest tests/path/test.py::test_name -v`
预期：FAIL，显示 "function not defined"

**步骤 3：编写最小实现**

```python
def function(input):
    return expected
```

**步骤 4：运行测试验证通过**

运行：`pytest tests/path/test.py::test_name -v`
预期：PASS

**步骤 5：提交**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
```

## 记住

- 始终提供精确文件路径
- 计划中包含完整代码（不是"添加验证"）
- 包含预期输出的精确命令
- 使用 @ 语法引用相关技能
- DRY、YAGNI、TDD、频繁提交

## 执行交接

保存计划后，提供执行选择：

**"计划完成并保存到 `docs/plans/<filename>.md`。两种执行选项："**

**1. 子代理驱动（当前会话）** - 我为每个任务分派新的子代理，任务间审查，快速迭代

**2. 并行会话（独立）** - 在工作树中打开新会话，使用 executing-plans 批量执行并设置检查点

**选择哪种方式？**

**如果选择子代理驱动**：
- **必需子技能**：使用 superpowers:subagent-driven-development
- 留在当前会话
- 每个任务使用新子代理 + 代码审查

**如果选择并行会话**：
- 引导他们在工作树中打开新会话
- **必需子技能**：新会话使用 superpowers:executing-plans

## 计划示例

### 简单功能

```markdown
### 任务 1：创建用户模型

**文件**：
- 创建：`src/models/user.py`
- 测试：`tests/models/test_user.py`

**步骤 1：编写用户模型测试**

```python
import pytest
from user import User

def test_create_user():
    user = User("Alice", "alice@example.com")
    assert user.name == "Alice"
    assert user.email == "alice@example.com"

def test_invalid_email():
    with pytest.raises(ValueError):
        User("Bob", "invalid-email")
```

**步骤 2：运行测试验证失败**

```bash
pytest tests/models/test_user.py -v
# 预期：ImportError 或 ModuleNotFoundError
```

**步骤 3：实现用户模型**

```python
import re

class User:
    def __init__(self, name: str, email: str):
        if not self._validate_email(email):
            raise ValueError("Invalid email format")
        self.name = name
        self.email = email

    @staticmethod
    def _validate_email(email: str) -> bool:
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        return re.match(pattern, email) is not None
```

**步骤 4：运行测试验证通过**

```bash
pytest tests/models/test_user.py -v
# 预期：2 passed
```

**步骤 5：提交**

```bash
git add src/models/user.py tests/models/test_user.py
git commit -m "feat: add user model with email validation"
```
```

### 复杂功能

```markdown
### 任务 3：实现 API 认证中间件

**文件**：
- 创建：`src/middleware/auth.py`
- 修改：`src/app.py:45-60`
- 测试：`tests/middleware/test_auth.py`

**步骤 1：编写认证测试**

```python
import pytest
from middleware.auth import authenticate
from fastapi import Request

@pytest.mark.asyncio
async def test_valid_token():
    token = "valid-token-123"
    request = Request(headers={"Authorization": f"Bearer {token}"})
    result = await authenticate(request)
    assert result == True

@pytest.mark.asyncio
async def test_missing_token():
    request = Request(headers={})
    with pytest.raises(HTTPException) as exc:
        await authenticate(request)
    assert exc.value.status_code == 401
```

**步骤 2：运行测试验证失败**

```bash
pytest tests/middleware/test_auth.py -v
# 预期：ImportError
```

**步骤 3：实现认证中间件**

```python
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def authenticate(request: Request) -> bool:
    try:
        credentials: HTTPAuthorizationCredentials = await security(request)
        token = credentials.credentials

        # 验证 token
        if not validate_token(token):
            raise HTTPException(status_code=401, detail="Invalid token")

        return True
    except Exception:
        raise HTTPException(status_code=401, detail="Missing or invalid token")

def validate_token(token: str) -> bool:
    # Token 验证逻辑
    valid_tokens = {"valid-token-123"}
    return token in valid_tokens
```

**步骤 4：集成到应用**

```python
# src/app.py
from middleware.auth import authenticate

@app.api_route("/protected")
@authenticate  # 添加认证装饰器
async def protected_endpoint():
    return {"message": "Access granted"}
```

**步骤 5：运行测试验证通过**

```bash
pytest tests/middleware/test_auth.py -v
# 预期：2 passed
```

**步骤 6：提交**

```bash
git add src/middleware/auth.py src/app.py tests/middleware/test_auth.py
git commit -m "feat: add JWT authentication middleware"
```
```

## 完整计划模板

```markdown
# [功能名称] 实施计划

> **对于 Claude**：必需子技能：使用 superpowers:executing-plans 逐步实施此计划。

**目标**：[一句话描述]

**架构**：[2-3 句话]

**技术栈**：[关键技术]

**依赖**：
- [ ] 依赖 1 已安装
- [ ] 依赖 2 已配置

**背景**：
- 当前实现：[现状]
- 问题陈述：[为什么需要此功能]
- 成功标准：[如何验证完成]

---

## 任务分解

### 任务 1：[第一个组件]
[详细步骤...]

### 任务 2：[第二个组件]
[详细步骤...]

...

## 验证清单

完成此计划后：
- [ ] 所有测试通过
- [ ] 代码符合项目风格
- [ ] 文档已更新
- [ ] 功能符合要求
```

## 最佳实践

### 1. 具体 > 抽象

**好的**：
```markdown
创建文件 `src/models/user.py`，实现以下类：
```python
class User:
    def __init__(self, name: str, email: str):
        ...
```
```

**不好的**：
```markdown
创建用户模型，处理验证。
```

### 2. 包含完整代码

**好的**：
```markdown
实现完整的函数：
```python
def function(param):
    # 完整实现
    return result
```
```

**不好的**：
```markdown
添加验证逻辑（3-5 行）
```

### 3. 精确命令

**好的**：
```markdown
运行：`pytest tests/test_user.py::test_create_user -v`
预期：PASS
```

**不好的**：
```markdown
运行测试验证功能
```

## 与其他技能的集成

**工作流程**：
1. **brainstorming** - 设计功能
2. **using-git-worktrees** - 创建隔离环境
3. **writing-plans** - 编写详细计划 ⬅️ 这里
4. **executing-plans** 或 **subagent-driven-development** - 实施
5. **requesting-code-review** - 审查实施
6. **finishing-a-development-branch** - 完成并清理

## 常见陷阱

**避免**：
- ❌ 计划过于抽象（"添加验证"）
- ❌ 跳过步骤（"测试并实现"）
- ❌ 假设上下文（"修改 API 处理程序"）
- ❌ 缺少验证步骤

**推荐**：
- ✅ 具体文件路径和行号
- ✅ 计划中包含完整代码
- ✅ 每个任务 2-5 分钟
- ✅ 包含验证和提交步骤

## 关键原则

- **精确路径**：始终提供精确文件路径
- **完整代码**：计划中包含完整代码
- **小步快跑**：每个任务 2-5 分钟
- **验证每步**：每个步骤都有验证
- **频繁提交**：每个任务后提交
- **引用技能**：使用 @ 语法引用相关技能
