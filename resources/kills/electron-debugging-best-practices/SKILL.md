---
name: electron-debugging-best-practices
description: Electron 应用调试最佳实践，包含真实调试案例、系统化调试方法和常见问题解决方案
category: 开发工具
tags: [electron, 调试, debugging, 错误处理, 开发流程]
---

# Electron 应用调试最佳实践

## 概述

本技能基于真实项目调试经验，提供系统化的 Electron 应用调试方法。重点强调**过早实施安全措施的危害**和**模块初始化时序问题**的解决思路。

### 适用场景

- ✅ Electron 应用模块加载时崩溃
- ✅ "Cannot read properties of null" 反复出现
- ✅ ConfigStore/ConfigManager 初始化问题
- ✅ 开发环境下正常，改动后系统无法启动

---

## 🔴 核心教训

### ❌ 过早实施安全措施的危害

**最重要的经验**：

> 💡 **在架构稳定前，不要实施严格的安全检查**
>
> 过早的"防御性编程"会导致：
> - 每次架构改动都要处理初始化失败
> - 调试时间成倍增加（数小时 → 数分钟）
> - 开发效率大幅下降

**真实案例对比**：

| 开发阶段 | 安全策略 | 结果 |
|---------|---------|------|
| **MVP** | 宽松检查（返回空值） | ✅ 快速迭代，架构灵活 |
| **稳定期** | 警告但不阻断 | ✅ 提前发现问题，不影响开发 |
| **生产期** | 严格检查（抛错） | ✅ 架构已稳定，可以收紧 |

### ❌ 常见错误模式

#### 错误模式 1: 模块顶层创建依赖实例

```typescript
// ❌ 错误：在模块加载时就创建实例
class ConfigStore {
  constructor() {
    this.store = new Store()  // 立即初始化
  }
}

export const configStore = new ConfigStore()  // ← 导入时就执行

export const permissionManager = new PermissionManager()  // ← 依赖 configStore
// ❌ ConfigStore 还没初始化，PermissionManager 就调用它了
```

**问题**：
- JavaScript 模块加载顺序是同步的
- 顶层代码在 `import` 时立即执行
- 无法保证初始化顺序

#### 错误模式 2: 过早的严格检查

```typescript
// ❌ 错误：过早期实施严格检查
getApiKey() {
  if (!this.store) {
    throw new Error('Not initialized')  // ❌ 开发阶段太严格
  }
  return this.store.get('apiKey')
}
```

**问题**：
- 开发阶段架构频繁变动
- 每次改动都可能触犯严格检查
- 调试困难（无法区分"真的没初始化"还是"时序问题"）

---

## ✅ 系统化调试方法

### Phase 1: Root Cause Investigation（根因分析）

**DO's**：
1. ✅ 仔细阅读完整错误信息
   ```
   Error: Cannot read properties of null (reading 'get')
       at PermissionManager.constructor (ConfigStore.ts:19)
       at Object.<anonymous> (PermissionManager.ts:224)
   ```
   - 关键信息：`constructor` → 问题在构造函数
   - 关键信息：`reading 'get'` → 尝试访问 `get` 方法
   - 关键信息：`ConfigStore.ts:19` → 精确定位代码位置

2. ✅ 理解模块加载顺序
   ```bash
   # 绘制模块依赖图
   main.ts → PermissionManager → ConfigStore
             ↓                    ↓
          (import)            (new Store)
   ```

3. ✅ 检查最近的代码改动
   ```bash
   git diff HEAD~5 electron/config/ConfigStore.ts
   ```

**DON'Ts**：
- ❌ 不要猜测问题（即使"看起来很明显"）
- ❌ 不要在没有证据的情况下修改代码
- ❌ 不要一次性修改多个地方

### Phase 2: Pattern Analysis（模式分析）

**找到工作模式**：

1. **对比工作正常的代码**
   ```typescript
   // ✅ SessionStore 工作正常
   constructor() {
     this.store = new Store({...})  // 直接初始化，没问题
   }
   ```

2. **识别关键差异**
   - SessionStore 不依赖其他模块
   - ConfigStore 被多个模块依赖
   - PermissionManager 在模块顶层创建

3. **理解依赖关系**
   ```
   ConfigStore (singleton)
     ↑
     | (被以下模块依赖)
     |
   ├─> PermissionManager (顶层创建)
   ├─> NotificationService (顶层创建)
   └─> AgentRuntime (延迟创建，所以正常)
   ```

### Phase 3: Hypothesis and Testing（假设与测试）

**形成单一假设**：

> "PermissionManager 在模块加载时就创建实例，此时 ConfigStore.init() 还未调用，导致崩溃"

**最小化验证**：
```typescript
// 1. 添加日志验证时序
constructor() {
  console.log('[PermissionManager] Constructor called')
  console.log('[PermissionManager] ConfigStore.isInitialized():', configStore.isInitialized())
  // ...
}
```

**验证结果**：
```
[PermissionManager] Constructor called
[PermissionManager] ConfigStore.isInitialized(): false  ← 假设确认
```

### Phase 4: Implementation（实施修复）

**原则**：一次只修复一个问题

❌ **错误做法**（同时修改多处）：
```typescript
// ❌ 一次修改太多
constructor() {
  if (configStore.isInitialized()) { ... }  // 修改 1
  this.authorizedFolders = new Set()  // 修改 2
  this.init()  // 修改 3
}
```

✅ **正确做法**（渐进式修复）：
```typescript
// ✅ 第一步：添加检查，不改变逻辑
constructor() {
  if (configStore.isInitialized()) {
    const folders = configStore.getAuthorizedFolders()
    folders.forEach(f => this.authorizedFolders.add(f))
  }
  // 未初始化时什么都不做（使用空 Set）
}

// ✅ 第二步：添加 reload 方法
reloadFromConfig() {
  this.authorizedFolders.clear()
  const folders = configStore.getAuthorizedFolders()
  folders.forEach(f => this.authorizedFolders.add(f))
}

// ✅ 第三步：在 main.ts 中调用
configStore.init()
permissionManager.reloadFromConfig()
```

---

## 🎯 具体修复方案

### 问题：ConfigStore 初始化时序

#### 修复前（崩溃）

```typescript
// electron/config/ConfigStore.ts
class ConfigStore {
  private store: Store<AppConfig> | null = null

  constructor() {
    this.store = new Store<AppConfig>({
      name: 'wechatflowwork-config',
      defaults
    })
  }

  getAuthorizedFolders() {
    return this.store.get('authorizedFolders')  // ❌ this.store 可能是 null
  }
}

export const configStore = new ConfigStore()  // ❌ 导入时就执行
```

```typescript
// electron/agent/security/PermissionManager.ts
export const permissionManager = new PermissionManager()  // ❌ 模块加载时创建

class PermissionManager {
  constructor() {
    const folders = configStore.getAuthorizedFolders()  // ❌ ConfigStore.store 可能是 null
    folders.forEach(f => this.authorizedFolders.add(f))
  }
}
```

**崩溃**：
```
Error: Cannot read properties of null (reading 'get')
  at PermissionManager.constructor (PermissionManager.ts:19)
```

#### 修复后（正常工作）

**步骤 1: 添加延迟初始化**

```typescript
// electron/config/ConfigStore.ts
class ConfigStore {
  private store: Store<AppConfig> | null = null
  private initialized: boolean = false

  // ❌ 移除构造函数中的初始化
  // constructor() {
  //   this.store = new Store({...})
  // }

  // ✅ 添加 init() 方法
  init(): void {
    if (this.initialized) return

    this.store = new Store<AppConfig>({
      name: 'wechatflowwork-config',
      defaults
    })

    this.initialized = true
  }

  // ✅ 添加初始化检查
  private ensureInitialized(): void {
    if (!this.initialized || !this.store) {
      throw new Error('ConfigStore not initialized')
    }
  }

  // ✅ 所有方法都调用 ensureInitialized()
  getAuthorizedFolders() {
    this.ensureInitialized()  // ← 关键修复
    return this.store!.get('authorizedFolders')
  }

  isInitialized(): boolean {
    return this.initialized
  }
}
```

**步骤 2: 修改依赖模块使用空状态**

```typescript
// electron/agent/security/PermissionManager.ts
class PermissionManager {
  private authorizedFolders: Set<string> = new Set()

  constructor() {
    // ✅ 检查 ConfigStore 是否已初始化
    if (configStore.isInitialized()) {
      const folders = configStore.getAuthorizedFolders()
      folders.forEach(f => this.authorizedFolders.add(f))
    }
    // ✅ 未初始化时使用空状态，不抛错
  }

  // ✅ 添加重新加载方法
  reloadFromConfig() {
    this.authorizedFolders.clear()
    const folders = configStore.getAuthorizedFolders()
    folders.forEach(f => this.authorizedFolders.add(f))
    log.log(`[PermissionManager] Reloaded ${this.authorizedFolders.size} folders`)
  }
}
```

**步骤 3: 在主进程中按顺序初始化**

```typescript
// electron/main.ts
app.whenReady().then(async () => {
  // 1. 设置 userData 路径
  app.setPath('userData', devUserData)

  // 2. 初始化 ConfigStore
  configStore.init()
  log.log('[Main] ConfigStore initialized')

  // 3. 重新加载依赖 ConfigStore 的模块
  const { permissionManager } = await import('./agent/security/PermissionManager.js')
  permissionManager.reloadFromConfig()
  log.log('[Main] PermissionManager reloaded')

  // ... 其他初始化
})
```

---

## 📊 调试工具和技巧

### 1. 日志驱动调试

**添加结构化日志**：

```typescript
// ✅ 好的日志（包含上下文）
constructor() {
  log.log('[PermissionManager] Constructor called')
  log.log('[PermissionManager] ConfigStore.isInitialized():', configStore.isInitialized())

  try {
    const folders = configStore.getAuthorizedFolders()
    log.log('[PermissionManager] Loaded folders:', folders.length)
  } catch (error) {
    log.error('[PermissionManager] Failed to load folders:', error)
  }
}
```

### 2. 条件断点

```typescript
// ✅ 添加环境变量控制的断点
if (process.env.DEBUG_MODULE_LOAD) {
  debugger  // 只在调试时暂停
}

const folders = configStore.getAuthorizedFolders()
```

### 3. 模块依赖图

**可视化依赖关系**：

```bash
# 使用 madge 生成依赖图
npx madge --image deps.svg electron/main.ts

# 或使用 depcheck
npx depcheck electron/
```

### 4. 堆栈跟踪分析

**完整错误堆栈**：
```
Error: Cannot read properties of null (reading 'get')
    at getAuthorizedFolders (ConfigStore.ts:347)
    at new PermissionManager (PermissionManager.ts:19)
    at Object.<anonymous> (PermissionManager.ts:224)
    at Module._compile (node:internal/modules/cjs/loader:1521)
    at Module.load (node:internal/modules/cjs/loader:1266)
```

**分析方法**：
1. 从上往下看（调用栈的顶部是最新调用）
2. 关注 **你的代码**（不是 node_modules）
3. 找到**第一个**你的代码行
4. 分析"为什么这个方法会被调用"

---

## 🚨 常见反模式

### 反模式 1: 过早的防御性编程

```typescript
// ❌ 过早实施严格检查
class MyService {
  private data: Data | null = null

  getData() {
    if (!this.data) {
      throw new Error('Data not initialized')  // ❌ 太严格
    }
    return this.data
  }
}
```

**问题**：
- 开发阶段数据可能来自多个来源
- 架构变动时经常触发这个错误
- 调试时无法区分"真的没数据"和"时序问题"

**改进**：
```typescript
// ✅ 渐进式检查
class MyService {
  private data: Data | null = null

  getData() {
    if (!this.data) {
      console.warn('[MyService] Data not initialized, using default')  // ⚠️ 警告
      return defaultData  // ✅ 返回默认值
    }
    return this.data
  }
}
```

### 反模式 2: 全局单例模式

```typescript
// ❌ 顶层创建单例
export const configStore = new ConfigStore()

// ❌ 其他模块在顶层使用
export const serviceA = new ServiceA(configStore)  // ← 导入时就执行
export const serviceB = new ServiceB(configStore)  // ← 导入时就执行
```

**问题**：
- JavaScript 无法保证模块加载顺序
- `serviceA` 可能在 `configStore.init()` 之前执行
- 错误信息不清晰（模块加载时崩溃）

**改进**：
```typescript
// ✅ 延迟创建实例
let _configStore: ConfigStore

export const configStore = {
  get() {
    if (!_configStore) {
      _configStore = new ConfigStore()
    }
    return _configStore
  }
}

// ✅ 在使用时才访问
const config = configStore.get()
```

### 反模式 3: 循环依赖

```typescript
// ❌ ConfigStore 依赖 PermissionManager
import { permissionManager } from './PermissionManager.js'

class ConfigStore {
  constructor() {
    permissionManager.authorizeFolder(defaultPath)  // ← 循环依赖
  }
}

// ❌ PermissionManager 依赖 ConfigStore
import { configStore } from './ConfigStore.js'

class PermissionManager {
  constructor() {
    this.folders = configStore.getAuthorizedFolders()  // ← 循环依赖
  }
}
```

**改进**：
```typescript
// ✅ 分离初始化和依赖注入
class ConfigStore {
  init() {
    // ✅ 不在构造函数中调用其他模块
  }
}

class PermissionManager {
  reloadFromConfig() {
    // ✅ 提供独立方法，在 ConfigStore.init() 后调用
  }
}

// ✅ 在 main.ts 中按顺序初始化
configStore.init()
permissionManager.reloadFromConfig()
```

---

## ✅ 最佳实践清单

### 开发阶段

- [ ] **使用宽松的检查**
  ```typescript
  return this.store?.get('key') || defaultValue
  ```

- [ ] **添加清晰的警告**
  ```typescript
  if (!this.store) {
    console.warn('[Component] Store not initialized yet, using defaults')
  }
  ```

- [ ] **提供安全的默认值**
  ```typescript
  const defaultConfig = { apiKey: '', folders: [] }
  return this.store?.get('config') || defaultConfig
  ```

### 架构稳定后

- [ ] **添加初始化检查**
  ```typescript
  private ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Not initialized')
    }
  }
  ```

- [ ] **提供初始化方法**
  ```typescript
  init() {
    if (this.initialized) return
    // 初始化逻辑
    this.initialized = true
  }
  ```

- [ ] **添加重新加载机制**
  ```typescript
  reload() {
    // 清空状态
    // 重新加载配置
  }
  ```

### 生产环境

- [ ] **启用严格模式**
  ```typescript
  if (process.env.NODE_ENV === 'production') {
    this.ensureInitialized()
  }
  ```

- [ ] **添加审计日志**
  ```typescript
  auditLogger.log('auth', 'access', { component: 'ConfigStore' })
  ```

- [ ] **监控错误**
  ```typescript
  errorMonitoring.captureException(error)
  ```

---

## 📚 相关资源

### 内部技能
- **electron-packaging-best-practices**: 包含本次调试的完整经验
- **systematic-debugging**: 系统化调试方法论

### 外部资源
- [Electron 官方调试指南](https://www.electronjs.org/docs/latest/tutorial/debugging)
- [Node.js 模块加载机制](https://nodejs.org/api/modules.html)
- [V8 堆栈跟踪 API](https://v8.dev/docs/stack-trace-api)

---

## 🎓 总结

**核心教训**：

1. **不要过早实施严格的安全检查** - 在架构稳定前使用宽松检查
2. **理解模块加载顺序** - JavaScript 模块是同步加载的，顶层代码立即执行
3. **使用渐进式修复** - 一次只修复一个问题，验证后再继续
4. **添加结构化日志** - 好的日志能节省数小时调试时间
5. **提供重新加载机制** - 允许在初始化完成后重新加载配置

**记住**：开发效率比完美主义更重要。在开发阶段，清晰的警告比抛错更有价值。在生产阶段，再收紧安全检查也不迟。

---

**案例来源**: SkillMate 项目 ConfigStore 初始化问题（2026-01-31）
**调试时间**: 数小时
**修复方法**: 延迟初始化 + 空状态 + reload 机制
**关键文件**: `electron/config/ConfigStore.ts`, `electron/agent/security/PermissionManager.ts`
