# MCP 配置编辑器 - 设计查看指南

## 问题说明

Pencil (.pen) 文件格式有特定的内部结构，直接编辑 JSON 可能无法正确渲染。

## 推荐查看方式

### 方式 1: HTML 交互预览（最佳）⭐

直接在浏览器中打开，可以看到完整的设计和交互：

```bash
# 在浏览器中打开
mcp-config-editor-redesign.html
```

**特点**：
- ✅ 完整的视觉效果
- ✅ 可交互（点击、搜索、切换）
- ✅ 无需任何软件
- ✅ 响应式布局

### 方式 2: React 组件预览

如果你有 React 开发环境，可以直接运行组件：

```bash
# 1. 在项目中查看组件
src/components/MCPConfigEditorRedesign.tsx

# 2. 在 SettingsView.tsx 中临时使用
import { MCPConfigEditorRedesign } from './MCPConfigEditorRedesign';

{showMCPConfig && (
  <MCPConfigEditorRedesign onClose={() => setShowMCPConfig(false)} />
)}
```

### 方式 3: 截图预览

我已经为你准备了详细的设计说明文档：

```
MCP_CONFIG_EDITOR_DESIGN.md - 完整设计规范
MCP_REDESIGN_README.md - 使用说明
```

## 设计规格

### 布局
- **总尺寸**: 1400px × 800px
- **侧边栏**: 340px 宽
- **配置面板**: 1060px 宽
- **工具栏**: 72px 高

### 颜色方案
- **主背景**: #0f1419（深灰黑）
- **次级背景**: #1a1f26（灰黑）
- **三级背景**: #252b33（浅灰黑）
- **强调色**: #3b82f6（蓝色）
- **边框**: #2d343d（深灰）

### 组件详情

#### 1. 工具栏 (72px 高)
- 标题："MCP 配置" + 蓝色装饰条
- 搜索框：280px 宽，圆角 8px
- 模板库按钮：100px 宽
- 添加服务器按钮：132px 宽，蓝色背景

#### 2. 侧边栏 (340px 宽)
- 服务器标题 + 数量显示
- 服务器卡片列表：
  - 卡片高度：88px
  - 状态点：10px 圆形（绿色=已连接，黄色=未连接）
  - 类型标签：48px 宽，圆角 4px

#### 3. 配置面板 (1060px 宽)
- 标题栏：标题 + 状态徽章
- 类型选择：两个大按钮（484px × 60px）
- 基础信息：名称、描述输入框（988px × 40px）
- 连接配置：命令、参数输入框
- 操作按钮：取消、测试连接、保存配置

## 如何获取设计资源

### 完整文件列表
1. `mcp-config-editor-redesign.html` - 浏览器预览（推荐）
2. `src/components/MCPConfigEditorRedesign.tsx` - React 组件
3. `MCP_CONFIG_EDITOR_DESIGN.md` - 设计规范
4. `MCP_REDESIGN_README.md` - 使用说明
5. `mcp-config-editor.pen` - Pencil 格式（可能不完全兼容）

### 如果需要设计稿图片

如果需要 PNG 或其他格式的图片，请告诉我，我可以：
1. 提供详细的尺寸和布局说明
2. 建议使用 HTML 预览并截图
3. 创建 SVG 矢量图版本

## 下一步建议

1. **查看设计**: 在浏览器中打开 `mcp-config-editor-redesign.html`
2. **测试组件**: 在开发环境中集成 React 组件
3. **提供反馈**: 如果需要调整设计，请告诉我具体需求

---

**提示**: 对于 UI 设计，浏览器 HTML 预览通常比原型工具更直观和准确。
