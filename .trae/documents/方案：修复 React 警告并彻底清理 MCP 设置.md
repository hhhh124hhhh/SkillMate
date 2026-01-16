# 方案：修复 React 警告并彻底清理 MCP 设置

您提到的警告 `Warning: A component is changing a controlled input to be uncontrolled` 是 React 中常见的问题，通常是因为组件状态初始化时为 `undefined`，后续变为具体值。

同时，根据您的要求，我将彻底清理代码中残留的 MCP 设置逻辑。虽然上次我们已经在 UI 上移除了 MCP 标签页，但代码中还有一些未使用的状态和注释。

## 1. 修复 Controlled/Uncontrolled 警告

**原因**: 在 `SettingsView.tsx` 中，`config` 对象的某些属性（如 `apiKey`, `apiUrl`, `model`）在初始状态可能未正确赋值，导致 input 变为 uncontrolled。当 `useEffect` 从后端加载配置后，它们有了值，变为 controlled，从而触发警告。

**解决**: 确保 `useState` 初始化时，所有属性都有明确的默认值（空字符串而非 undefined）。并在 `useEffect` 更新状态时，确保合并逻辑不会引入 `undefined`。

## 2. 彻底移除 MCP 设置代码

**变动**:
*   删除 `SettingsView.tsx` 中被注释掉的 MCP 状态代码。
*   删除未使用的 `mcpConfig` 和 `mcpSaved` 变量。
*   删除 `saveMcpConfig` 函数。
*   确认 UI 渲染部分不再包含任何 MCP 相关逻辑。

## 3. 实施步骤

1.  **修改 `SettingsView.tsx`**:
    *   清理残留的 MCP 注释代码。
    *   检查 `setConfig` 逻辑，确保所有字段都有默认值，防止 undefined。
    *   具体检查 `config.apiKey`, `config.apiUrl`, `config.model` 等字段。

通过这次清理，不仅能消除控制台的红色警告，还能让代码库更加整洁，完全符合“移除 MCP 设置”的目标。
