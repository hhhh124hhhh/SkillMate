# 启动 OpenCowork 项目计划

## 项目分析
这是一个基于 Electron + React + TypeScript 的桌面应用，使用 Vite 作为构建工具。项目名称为 "public-account-assistant"（OpenCowork），是一个智能协作助手。

## 启动步骤

### 1. 配置环境变量
- 复制 `.env.template` 文件并重命名为 `.env`
- 填写必要的 API 密钥：
  - ANTHROPIC_API_KEY：Anthropic API 密钥（用于 Claude 模型）
  - DOUBAO_API_KEY：Doubao API 密钥（用于图像生成）
  - ZHIPU_API_KEY：Zhipu API 密钥（用于写作助手）

### 2. 启动开发服务器
- 运行 `npm run dev` 命令启动 Vite 开发服务器
- 服务器启动后，Electron 应用会自动打开

### 3. 验证启动状态
- 检查应用是否正常打开
- 确认界面加载完成
- 验证基本功能是否可用

## 注意事项
- 如果没有 API 密钥，部分功能可能无法正常使用
- 首次启动可能需要一些时间来加载依赖和构建应用
- 如果遇到启动问题，请检查控制台输出的错误信息