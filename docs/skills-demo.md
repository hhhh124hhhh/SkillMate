# SkillMate - 技能使用演示

**版本**: v2.0
**更新日期**: 2025-01-21

---

## 🎯 演示概述

本文档演示如何在实际使用中应用 SkillMate 的 35 个内置技能。

---

## 📚 场景 1: 文档处理技能

### 1.1 提取 PDF 文本

**用户需求**：
> "提取 document.pdf 中的所有文本和表格"

**AI 响应**：
```
我将使用 pdf-processor 技能来处理这个 PDF 文件。

[SKILL LOADED: pdf-processor]

SKILL DIRECTORY: D:\skill-mate\resources\skills\pdf-processor

## Python 库

### pypdf - 基本操作

#### 提取文本
```python
from pypdf import PdfReader

reader = PdfReader("document.pdf")
text = ""
for page in reader.pages:
    text += page.extract_text()

print(text)
```

#### 提取表格
```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            print(table)
```

我将为您编写一个 Python 脚本来提取这个 PDF 的内容...

run_command: python "D:\skill-mate\resources\skills\pdf-processor\scripts\extract.py" "document.pdf"
```

**结果**：
- ✅ 成功提取 PDF 文本
- ✅ 成功提取表格数据
- ✅ 输出为结构化格式

---

### 1.2 分析 Excel 数据

**用户需求**：
> "分析 sales.xlsx 中的销售数据，生成统计报表"

**AI 响应**：
```
我将使用 xlsx-analyzer 技能来分析这个 Excel 文件。

[SKILL LOADED: xlsx-analyzer]

## 关键：使用公式，而非硬编码值

我会创建一个分析脚本：
```python
from openpyxl import load_workbook

wb = load_workbook('sales.xlsx')
ws = wb.active

# 使用公式计算总和
ws['B10'] = '=SUM(B2:B9)'

# 读取数据
data = []
for row in ws.iter_rows(min_row=2, values_only=True):
    data.append(row)

import pandas as pd
df = pd.DataFrame(data, columns=['Date', 'Product', 'Sales'])

# 生成统计报告
print(df.describe())
print(f"总销售额: {df['Sales'].sum()}")
print(f"平均销售额: {df['Sales'].mean()}")
```

run_command: python "D:\skill-mate\temp\analyze_sales.py"
```

**结果**：
- ✅ 数据分析完成
- ✅ 生成统计报表
- ✅ 可视化图表建议

---

## 🎨 场景 2: 设计创作技能

### 2.1 设计前端界面

**用户需求**：
> "使用 frontend-design 技能设计一个现代化的登录页面"

**AI 响应**：
```
我将使用 frontend-design 技能来设计这个登录页面。

[SKILL LOADED: frontend-design]

## 设计思维

在编码之前，我需要选择一个风格方向。

**风格选择**: 极简主义 + 深色主题

## 设计方案

### 布局结构
- 居中登录卡片
- 背景渐变效果
- 微妙动画

### 颜色方案
- 主色: #667eea (紫色渐变)
- 背景: #1a1a2e (深蓝)
- 文字: #ffffff (白色)

我将创建 React 组件...
```

**生成的代码**：
```jsx
// LoginPage.tsx
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900
                flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8
                  shadow-2xl w-96 border border-white/20">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          欢迎回来
        </h2>
        <form className="space-y-4">
          <input
            type="email"
            placeholder="邮箱"
            className="w-full px-4 py-3 rounded-lg bg-white/20
                     text-white placeholder-white/60 border-0
                     focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            placeholder="密码"
            className="w-full px-4 py-3 rounded-lg bg-white/20
                     text-white placeholder-white/60 border-0
                     focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600
                   text-white font-semibold rounded-lg
                   hover:from-purple-700 hover:to-indigo-700
                   transition-all duration-300"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### 2.2 算法艺术创作

**用户需求**：
> "使用 algorithmic-art 技能创建一个流动场艺术作品"

**AI 响应**：
```
我将使用 algorithmic-art 技能来创建生成艺术。

[SKILL LOADED: algorithmic-art]

## 算法哲学

"Organic Turbulence"（有机湍流）

### 理念
混沌被自然法则约束，秩序从混乱中涌现。

### 算法表达
使用多层 Perlin 噪声驱动的流场：
- 数千个粒子跟随向量力
- 它们的轨迹积累成有机密度图
- 多个噪声八度创建湍流区域和平静区域
- 颜色从速度和密度中浮现
```

**生成的 p5.js 代码**：
```javascript
let particles = [];
const particleCount = 2000;
const noiseScale = 0.01;

function setup() {
  createCanvas(1200, 1200);
  randomSeed(12345);
  noiseSeed(12345);

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

function draw() {
  background(20, 20, 30, 10);

  for (let p of particles) {
    p.update();
    p.display();
  }
}

class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 2;
    this.prevPos = this.pos.copy();
  }

  update() {
    let angle = noise(this.pos.x * noiseScale,
                      this.pos.y * noiseScale)
                * TWO_PI * 4;
    let force = p5.Vector.fromAngle(angle);
    this.applyForce(force);

    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.prevPos = this.pos.copy();
    this.pos.add(this.vel);
    this.acc.mult(0);

    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.y < 0) this.pos.y = height;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  display() {
    let speed = this.vel.mag();
    let alpha = map(speed, 0, this.maxSpeed, 50, 255);
    stroke(138, 43, 226, alpha);
    strokeWeight(1.5);
    line(this.prevPos.x, this.prevPos.y,
         this.pos.x, this.pos.y);
  }
}
```

---

## 🔄 场景 3: 开发工作流技能

### 3.1 TDD 开发功能

**用户需求**：
> "使用 test-driven-development 技能帮我开发用户认证功能"

**AI 响应**：
```
我将使用 test-driven-development 技能来开发这个功能。

[SKILL LOADED: test-driven-development]

## 铁律

没有失败的测试就没有生产代码

## TDD 流程：Red-Green-Refactor

### RED - 编写失败测试

首先，我会编写一个测试来验证用户认证：

```typescript
// tests/auth.test.ts
import { describe, it, expect } from 'vitest';
import { authenticateUser } from '../src/auth';

describe('User Authentication', () => {
  it('should authenticate user with valid credentials', async () => {
    const result = await authenticateUser({
      email: 'test@example.com',
      password: 'correct_password'
    });
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const result = await authenticateUser({
      email: 'test@example.com',
      password: 'wrong_password'
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });
});
```

### 验证 RED - 运行测试确认失败

```bash
npm run test
```

预期输出：
```
FAIL src/auth.test.ts
  ✗ should authenticate user with valid credentials
    ReferenceError: authenticateUser is not defined
```

✅ 测试失败，原因正确（功能尚未实现）

### GREEN - 编写最小代码通过测试

```typescript
// src/auth.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function authenticateUser(credentials: { email: string; password: string }) {
  // 1. 从数据库查找用户
  const user = await db.users.findUnique({
    where: { email: credentials.email }
  });

  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }

  // 2. 验证密码
  const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Invalid credentials' };
  }

  // 3. 生成 JWT token
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  return { success: true, token };
}
```

### 验证 GREEN - 运行测试确认通过

```bash
npm run test
```

预期输出：
```
PASS src/auth.test.ts
  ✓ should authenticate user with valid credentials
  ✓ should reject invalid credentials

Test Files  1 passed (1)
```

✅ 所有测试通过！

### REFACTOR - 清理代码

测试通过后，我们可以进行重构：
- 提取密码验证逻辑
- 添加错误处理
- 优化数据库查询

保持测试绿色，不添加行为。
```

---

### 3.2 系统化调试 Bug

**用户需求**：
> "使用 systematic-debugging 技能帮我调试登录失败的 bug"

**AI 响应**：
```
我将使用 systematic-debugging 技能来系统化地调试这个问题。

[SKILL LOADED: systematic-debugging]

## 四个阶段

### 阶段 1: 根本原因调查

#### 1. 仔细阅读错误消息

请提供完整的错误消息或堆栈跟踪。

#### 2. 一致地重现

我需要知道：
- 如何触发这个 bug？
- 每次都发生吗？
- 具体的重现步骤是什么？

#### 3. 检查最近的更改

让我查看最近的 Git 提交：
```bash
git log --oneline -10
git diff HEAD~1
```

#### 4. 跟踪数据流

我需要追踪：
- 用户输入 → API 请求 → 控制器 → 服务 → 数据库
- 哪个环节出了问题？

### 阶段 2: 模式分析

#### 1. 找到工作示例

让我查看其他成功的登录实现：
```bash
git show HEAD~1:src/auth.ts
```

#### 2. 识别差异

对比工作版本和当前版本，找出变更点。

### 阶段 3: 假设和测试

**假设**: 密码哈希比较逻辑有误

**测试**:
```typescript
console.log('Input password:', password);
console.log('Stored hash:', user.passwordHash);
console.log('Comparison result:', await bcrypt.compare(password, user.passwordHash));
```

### 阶段 4: 实施修复

假设验证后，实施修复：
```typescript
// 修复前
const isValid = password === user.passwordHash; // ❌ 错误：直接比较

// 修复后
const isValid = await bcrypt.compare(password, user.passwordHash); // ✅ 正确：使用 bcrypt
```

**验证修复**: 运行测试确认 bug 已解决。
```

---

## 🔧 场景 4: Git 工作流技能

### 4.1 并行开发多个功能

**用户需求**：
> "使用 using-git-worktrees 为功能 A 和功能 B 创建独立的开发环境"

**AI 响应**：
```
我将使用 using-git-worktrees 技能来创建隔离的开发环境。

[SKILL LOADED: using-git-worktrees]

## 创建工作树

### 步骤 1: 为功能 A 创建工作树
```bash
git worktree add ../myproject-feature-a feature-a
```

### 步骤 2: 为功能 B 创建工作树
```bash
git worktree add ../myproject-feature-b feature-b
```

### 步骤 3: 查看所有工作树
```bash
git worktree list
```

输出：
```
/work/myproject              1234abcd [main]
/work/myproject-feature-a      5678efgh [feature-a]
/work/myproject-feature-b      9012ijkl [feature-b]
```

### 步骤 4: 在不同工作树中工作

# 开发功能 A
cd ../myproject-feature-a
# 实现功能 A...
git add .
git commit -m "feat: implement feature A"

# 开发功能 B
cd ../myproject-feature-b
# 实现功能 B...
git add .
git commit -m "feat: implement feature B"
```

### 步骤 5: 完成后清理
```bash
# 合并功能 A
cd ../myproject
git merge feature-a
git worktree remove ../myproject-feature-a

# 合并功能 B
git merge feature-b
git worktree remove ../myproject-feature-b
```

✅ 两个功能并行开发完成！
```

---

### 4.2 请求代码审查

**用户需求**：
> "使用 requesting-code-review 审查我的登录功能实现"

**AI 响应**：
```
我将使用 requesting-code-review 技能来审查您的代码。

[SKILL LOADED: requesting-code-review]

## 代码审查清单

### 1. 功能正确性

#### ✅ 功能符合需求
- [ ] 实现了用户认证
- [ ] 支持邮箱和密码登录
- [ ] 返回 JWT token

#### ✅ 边界情况处理
- [ ] 用户不存在
- [ ] 密码错误
- [ ] 空邮箱/密码

### 2. 代码质量

#### ✅ 代码清晰
- [ ] 变量命名描述性
- [ ] 函数单一职责
- [ ] 适当的注释

#### ✅ 错误处理
- [ ] 所有错误路径都有处理
- [ ] 返回清晰的错误消息

### 3. 测试覆盖

#### ✅ 单元测试
- [ ] 测试成功路径
- [ ] 测试失败路径
- [ ] 测试边界情况

### 4. 安全性

#### ⚠️ 需要改进

**问题 1**: 密码哈希未加盐
```typescript
// ❌ 当前实现
const hash = bcrypt.hash(password, 10);

// ✅ 建议修复
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);
```

**问题 2**: JWT secret 使用默认值
```typescript
// ❌ 当前实现
const token = jwt.sign({ userId }, 'secret'); // 危险！

// ✅ 建议修复
const token = jwt.sign({ userId }, process.env.JWT_SECRET);
```

### 5. 性能

#### ✅ 数据库查询
- 使用索引（email 字段）
- 只查询需要的字段

### 6. 文档

#### ⚠️ 需要改进
- [ ] 添加 JSDoc 注释
- [ ] 更新 README

## 审查总结

**通过项**: 15/20 (75%)
**需要改进**: 5 项

**建议**:
1. 修复安全问题（加盐、环境变量）
2. 添加更多测试用例
3. 完善文档注释

修复后可重新审查。
```

---

## 📊 场景 5: 完整工作流演示

### 从想法到实现

**用户需求**：
> "我想为应用添加一个用户个人资料编辑功能"

**完整工作流**：

#### 1️⃣ Brainstorming（头脑风暴）
```
我将使用 brainstorming 技能来探索这个需求。

[SKILL LOADED: brainstorming]

## 问题理解

### 1. 功能范围
- 编辑哪些字段？（用户名、头像、简介？）
- 如何验证？（权限检查？）
- 存储在哪里？

### 2. 技术方案

**方案 A: 简单表单**（推荐）
- 优点：实现快，用户体验好
- 缺点：功能有限

**方案 B: 多步骤向导**
- 优点：体验更精细
- 缺点：开发时间长

**方案 C: 实时预览**
- 优点：即时反馈
- 缺点：复杂度高

我推荐方案 A：简单表单。原因：
- MVP 快速验证
- 满足核心需求
- 后续可扩展

您同意方案 A 吗？

（用户同意方案 A）

## 详细设计

### 组件结构
```
UserProfileEditor
├── ProfileForm
│   ├── UsernameInput
│   ├── AvatarUploader
│   └── BioTextarea
└── PreviewCard
```

### 数据流
```
用户输入 → 本地验证 → API 请求 → 数据库更新 → 成功反馈
```

### 文件结构
```
src/
├── components/
│   └── UserProfileEditor.tsx
├── api/
│   └── profile.ts
├── types/
│   └── user.ts
└── hooks/
    └── useUserProfile.ts
```
```

#### 2️⃣ Writing Plans（编写计划）
```
我将使用 writing-plans 技能创建实施计划。

[SKILL LOADED: writing-plans]

# 用户个人资料编辑功能 - 实施计划

> 使用 executing-plans 实施此计划

**目标**: 实现用户个人资料的查看和编辑功能

**架构**: React + TypeScript + Tailwind CSS

**技术栈**: React Hook Form, Zod 验证

---

## 任务分解

### 任务 1: 创建类型定义

**文件**: `src/types/user.ts`

```typescript
export interface UserProfile {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileInput {
  username?: string;
  avatar?: string;
  bio?: string;
}
```

**步骤 1**: 创建文件 → **步骤 2**: 提交

### 任务 2: 实现 API 客户端

**文件**: `src/api/profile.ts`

**步骤 1**: 编写 API 函数测试...
**步骤 2**: 实现函数...
**步骤 3**: 提交

### 任务 3: 创建表单组件

**文件**: `src/components/UserProfileEditor.tsx`

**步骤 1**: 编写组件测试...
**步骤 2**: 实现组件...
**步骤 3**: 提交

...（省略后续任务）
```

#### 3️⃣ Test-Driven Development（TDD）
```
我将使用 test-driven-development 技能来实施。

[SKILL LOADED: test-driven-development]

## RED - 编写失败测试

```typescript
// UserProfileEditor.test.tsx
describe('UserProfileEditor', () => {
  it('should display user profile', () => {
    render(<UserProfileEditor profile={mockProfile} />);
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
  });

  it('should update profile on submit', async () => {
    const onUpdate = jest.fn();
    render(<UserProfileEditor profile={mockProfile} onUpdate={onUpdate} />);

    await user.type(screen.getByLabelText('用户名'), 'newname');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onUpdate).toHaveBeenCalledWith({
      username: 'newname'
    });
  });
});
```

**验证 RED**: 测试失败（组件未实现）✅

## GREEN - 实现组件

```typescript
export function UserProfileEditor({ profile, onUpdate }) {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    onUpdate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('username')} defaultValue={profile.username} />
      <button type="submit">保存</button>
    </form>
  );
}
```

**验证 GREEN**: 测试通过 ✅
```

#### 4️⃣ Systematic Debugging（调试）
```
测试发现 bug：头像上传失败。

我将使用 systematic-debugging 调试。

[SKILL LOADED: systematic-debugging]

## 阶段 1: 根本原因调查

**错误消息**: "Failed to upload avatar: File too large"

**分析**:
1. 检查文件大小限制配置
2. 查看服务器日志
3. 验证前端上传逻辑

**发现**: 服务器限制 1MB，但前端允许 5MB

**根本原因**: 配置不一致

## 阶段 2: 模式分析

**参考**: 其他图片上传功能
- 使用 2MB 限制
- 前端预验证文件大小

## 阶段 3: 假设和测试

**假设**: 统一配置为 2MB 限制

**实施**:
- 前端: 添加 2MB 验证
- 后端: 调整 limit 为 2MB

**验证**: 测试通过 ✅
```

#### 5️⃣ Verification Before Completion（验证）
```
我将使用 verification-before-completion 验证完成。

[SKILL LOADED: verification-before-completion]

## 验证清单

### 1. 功能验证
```bash
npm run test
```
**结果**: 15/15 测试通过 ✅

### 2. 类型检查
```bash
npm run typecheck
```
**结果**: 无类型错误 ✅

### 3. Lint 检查
```bash
npm run lint
```
**结果**: 无 lint 错误 ✅

### 4. 手动测试
- [x] 查看个人资料
- [x] 编辑用户名
- [x] 上传头像
- [x] 修改简介
- [x] 表单验证
- [x] 错误处理

**结果**: 所有功能正常 ✅

### 5. 性能测试
- [x] 加载时间 < 500ms ✅
- [x] 提交响应 < 200ms ✅

**结论**: 所有验证通过，可以提交 ✅
```

#### 6️⃣ Requesting Code Review（请求审查）
```
我将使用 requesting-code-review 审查实现。

[SKILL LOADED: requesting-code-review]

## 审查结果

**功能**: ✅ 完整
**质量**: ✅ 代码清晰
**测试**: ✅ 覆盖充分
**性能**: ✅ 符合要求
**安全**: ✅ 验证完善
**文档**: ⚠️ 需要添加 JSDoc

**建议**: 添加注释后即可合并
```

#### 7️⃣ Receiving Code Review（处理反馈）
```
我将使用 receiving-code-review 处理审查反馈。

[SKILL LOADED: receiving-code-review]

## 反馈处理

**反馈 1**: "建议添加 JSDoc 注释"

**验证**: 合理建议

**实施 (TDD)**:
```typescript
/**
 * 用户个人资料编辑器
 * @param profile - 用户个人资料
 * @param onUpdate - 更新回调
 * @returns JSX 元素
 */
export function UserProfileEditor({
  profile,
  onUpdate
}: UserProfileEditorProps) {
  // ...
}
```

**验证**: 再次审查通过 ✅
```

#### 8️⃣ Finishing Development（完成开发）
```
我将使用 finishing-development 完成开发。

[SKILL LOADED: finishing-development]

## 步骤 1: 验证测试
```bash
npm test
```
✅ 所有测试通过

## 步骤 2: 选择集成方式

**选项**:
1. 本地合并回 main
2. 推送并创建 PR
3. 保持分支
4. 丢弃工作

**选择**: 2 - 创建 PR

## 步骤 3: 执行
```bash
git push -u origin feature-user-profile
gh pr create --title "feat: user profile editor" --body "..."

## 步骤 4: 清理
```bash
git worktree remove ../myproject-user-profile
```

✅ 功能开发完成！
```

---

## 🎉 总结

### 技能组合示例

**完整开发流程**:
```
brainstorming → writing-plans → test-driven-development
→ systematic-debugging → verification-before-completion
→ requesting-code-review → receiving-code-review
→ finishing-development
```

**性能提升对比**:
- 启动时间: ↓ 60%
- 重复调用: ↑ 90%
- 加载速度: ↑ 40%

**技能总数**: 35 个
- 文档处理: 5 个
- 设计创作: 4 个
- 开发工具: 5 个
- 开发工作流: 5 个
- Git 工作流: 4 个
- 内部通信: 1 个
- 微信创作: 16 个（内置）

---

## 💡 使用建议

### 1. 明确指定技能
```
使用 [技能名] 来...
```

### 2. 提供充分上下文
```
我正在开发一个 [项目类型]
需要 [具体功能]
使用 [技能名] 来帮助我...
```

### 3. 组合使用技能
```
首先使用 brainstorming 探索方案
然后使用 writing-plans 制定计划
最后使用 test-driven-development 实施
```

---

**开始使用 SkillMate，体验 35 个强大技能带来的效率提升！** 🚀
