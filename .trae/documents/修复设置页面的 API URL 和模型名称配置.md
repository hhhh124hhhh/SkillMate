## 修复设置页面的配置问题

### 需要修改的内容：

1. **修正 API URL 默认值**（SettingsView.tsx）
   - 将 `https://open.bigmodel.cn/api/coding/paas/v4` 改为 `https://open.bigmodel.cn/api/anthropic`
   - 修改位置：第 28 行和第 65 行

2. **修改模型名称的提示文本**（SettingsView.tsx）
   - 将"输入模型名称，如 MiniMax-M2.1"改为更合适的提示
   - 修改位置：第 228-231 行

3. **可选：将模型名称字段标记为只读或禁用**
   - 因为用户说模型名称应该是固定的 GLM-4.7