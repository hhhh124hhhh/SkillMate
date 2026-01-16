# 修改计划

## 目标
将CoworkView.tsx文件中input元素的placeholder修改为更具模板性的内容，让用户可以直接在模板中填写信息。

## 修改内容
1. **文件路径**：`f:\person\3-数字化集锦\wechatflowwork\src\components\CoworkView.tsx`
2. **修改位置**：第486行
3. **当前代码**：
   ```tsx
   placeholder={mode === 'chat' ? "输入消息... (Ctrl+L 聚焦)" : workingDir ? "描述任务... (Ctrl+L 聚焦)" : "请先选择工作目录"}
   ```
4. **修改后代码**：
   ```tsx
   placeholder={mode === 'chat' ? "输入消息... (Ctrl+L 聚焦)" : workingDir ? "【】热门选题 (Ctrl+L 聚焦)" : "请先选择工作目录"}
   ```

## 理由
- 模板形式的placeholder（如"【】热门选题"）可以给用户更明确的输入指导
- 这种格式符合用户的使用习惯，让用户知道在哪里填写具体内容
- 保持了原有的快捷键提示信息，确保用户体验的一致性
- 仅修改了work模式下的placeholder，不影响chat模式的使用