# MCP 保存功能修复 - 测试指南

**修复日期**: 2026-01-25
**修复内容**: 修复 MCPConfigEditor.tsx 中配置无法保存的问题
**测试时间**: 约 5 分钟

---

## 修复内容摘要

### 问题
- ❌ "保存配置"按钮只更新内存，不保存到文件
- ❌ 用户填写 API Key 后刷新页面，配置丢失
- ❌ 配置包含占位符时无法自动启用服务器

### 解决方案
- ✅ **修复 `saveEdit` 函数**：添加 IPC 调用保存到文件
- ✅ **添加配置验证**：检查占位符、格式错误、API Key 格式
- ✅ **添加自动保存**：编辑表单后 1 秒自动保存（防抖）
- ✅ **添加用户反馈**：Toast 通知保存成功/失败
- ✅ **自动重载服务器**：保存后自动重启 MCP 服务器

---

## 测试步骤

### 准备工作

1. **打开开发者工具**
   ```bash
   cd d:\wechat-flowwork
   npm run dev
   ```
   - 启动后自动打开 DevTools（开发模式）
   - 切换到 "Console" 标签页查看日志

2. **查看当前配置**
   ```bash
   node test-mcp-config.js
   ```
   - 记录当前的 Authorization header 值

---

### 测试 1: 手动保存（"保存配置"按钮）

**目标**: 验证点击"保存配置"按钮后，配置确实保存到文件

**步骤**:
1. 打开应用设置 → MCP 配置
2. 点击"百度千帆AI搜索"的"编辑"按钮
3. 修改 Authorization header：
   ```
   Bearer bce-v3/ALTAK-xxx
   ```
   （替换为实际的 API Key，格式：`Bearer ` + 空格 + Key）
4. 点击"保存配置"按钮

**预期结果**:
- ✅ 显示绿色 Toast：`✅ "baidu-search" 配置已保存并自动启用`
- ✅ Console 显示：`[MCP] ✅ "baidu-search" 已保存，服务器已重载`
- ✅ 服务器状态从"禁用"变为"已连接"

**验证保存成功**:
```bash
# 在新的终端窗口运行
node test-mcp-config.js
```

**预期输出**:
```
✅ 找到百度搜索配置
Authorization header:
  值: Bearer bce-v3/ALTAK-xxx...
✅ Authorization header 已填写
✅ Authorization header 格式正确
✅ 百度搜索服务器已启用
✅ API Key 格式正确
```

---

### 测试 2: 自动保存（防抖 1 秒）

**目标**: 验证编辑表单后 1 秒自动保存，无需点击"保存配置"

**步骤**:
1. 打开应用设置 → MCP 配置
2. 点击"百度千帆AI搜索"的"编辑"按钮
3. 修改任意字段（例如 `description`）
4. **不要点击"保存配置"按钮**
5. 等待 1 秒钟

**预期结果**:
- ✅ Console 显示：`[Auto-save] ✅ "baidu-search" 已自动保存`
- ✅ Console 显示：`[Auto-save] ✅ "baidu-search" 服务器已重载`
- ✅ 关闭并重新打开编辑窗口，修改的内容仍然存在

**验证保存成功**:
```bash
# 再次运行诊断脚本
node test-mcp-config.js
```

---

### 测试 3: 配置验证（占位符检测）

**目标**: 验证包含占位符的配置不会被保存

**步骤**:
1. 打开应用设置 → MCP 配置
2. 点击"百度千帆AI搜索"的"编辑"按钮
3. 将 Authorization header 改回占位符：
   ```
   Bearer YOUR_BAIDU_API_KEY_HERE
   ```
4. 点击"保存配置"按钮

**预期结果**:
- ❌ 显示红色 Toast：`❌ 配置验证失败`
- ❌ Toast 显示具体错误：
  ```
  Authorization header 包含占位符（请替换为实际的 API Key）
  ```
- ❌ Console 显示：`[MCP] ❌ 配置验证失败，保存已取消`

---

### 测试 4: 配置验证（格式错误检测）

**目标**: 验证格式错误的 Authorization 会被检测

**步骤**:
1. 打开应用设置 → MCP 配置
2. 点击"百度千帆AI搜索"的"编辑"按钮
3. 输入错误格式的 Authorization（使用加号代替空格）：
   ```
   Bearer+bce-v3/ALTAK-xxx
   ```
4. 点击"保存配置"按钮

**预期结果**:
- ❌ 显示红色 Toast：`❌ 配置验证失败`
- ❌ Toast 显示：
  ```
  Authorization 格式错误（应为 "Bearer KEY"，注意 Bearer 后面是空格不是加号）
  ```

---

### 测试 5: 自动保存跳过无效配置

**目标**: 验证自动保存会跳过无效配置

**步骤**:
1. 打开应用设置 → MCP 配置
2. 点击"百度千帆AI搜索"的"编辑"按钮
3. 将 Authorization 改为占位符：
   ```
   Bearer YOUR_BAIDU_API_KEY_HERE
   ```
4. 等待 1 秒钟（不要点击"保存配置"）

**预期结果**:
- ⚠️ Console 显示警告：`[Auto-save] 配置验证失败，跳过自动保存`
- ⚠️ Console 显示验证错误列表
- ✅ 配置文件未被修改

**验证**:
```bash
node test-mcp-config.js
```

应该显示之前的有效配置仍然存在（没有被占位符覆盖）。

---

## 完整测试清单

- [ ] **测试 1**: 手动保存成功
- [ ] **测试 2**: 自动保存成功
- [ ] **测试 3**: 占位符被拒绝
- [ ] **测试 4**: 格式错误被检测
- [ ] **测试 5**: 自动保存跳过无效配置
- [ ] **最终验证**: 运行 `node test-mcp-config.js` 全部通过

---

## 常见问题

### Q: 自动保存和手动保存有什么区别？
A: 功能完全相同，只是触发方式不同：
- **手动保存**: 点击"保存配置"按钮立即保存
- **自动保存**: 编辑表单后等待 1 秒自动保存

两者都会：
- 验证配置
- 保存到文件
- 重载 MCP 服务器
- 显示 Toast/Console 日志

### Q: 为什么需要验证配置？
A: 防止无效配置覆盖有效配置：
- 占位符（`YOUR_BAIDU_API_KEY_HERE`）
- 格式错误（`Bearer+` 代替 `Bearer `）
- 缺少必需字段（`baseUrl`, `headers`）

只有配置有效时才会保存，避免用户误操作导致服务中断。

### Q: 如果保存失败怎么办？
A: 检查以下几点：
1. **Console 日志**: 查看具体错误信息
2. **文件权限**: 确保 `C:\Users\Lenovo\.aiagent\mcp.json` 可写
3. **配置格式**: 确保 JSON 格式正确（可用 `test-mcp-config.js` 验证）

---

## 技术细节

### 修改的文件
- `src/components/MCPConfigEditor.tsx` (lines 250-379)

### 关键改动
1. **`saveEdit` 函数** (lines 250-310):
   - 从同步改为 `async`
   - 添加 `validateServerConfig` 验证
   - 添加 `mcp:save-config` IPC 调用
   - 添加 Toast 通知
   - 添加 `mcp:reload-all` 重载服务器

2. **`validateServerConfig` 函数** (lines 312-332):
   - 检查 `baseUrl` 存在性
   - 检查 `Authorization` header 存在性
   - 检测占位符（`YOUR_`, `API_KEY_HERE`）
   - 验证格式（`Bearer ` 后面是空格不是加号）
   - 验证 API Key 格式（百度千帆应为 `bce-v3/` 开头）

3. **`useEffect` 自动保存** (lines 334-379):
   - 监听 `editForm`, `editingServer`, `config` 变化
   - 防抖 1 秒（`setTimeout` 1000ms）
   - 验证配置后自动保存
   - 配置无效时跳过保存并记录警告

### IPC 通信
- `mcp:save-config`: 保存配置到文件
- `mcp:reload-all`: 重载所有 MCP 服务器
- `mcp:get-status`: 获取服务器状态

---

**测试完成后，请反馈结果以便进一步优化。**
