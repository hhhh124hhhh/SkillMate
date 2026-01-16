## 启动计划

### 步骤 1：检查依赖
- 项目已包含 package-lock.json，说明依赖可能已安装
- 如未安装依赖，需要先运行 `npm install`

### 步骤 2：配置环境变量
- 创建 .env 文件（基于 .env.example）
- 配置 ANTHROPIC_API_KEY 环境变量

### 步骤 3：启动项目
- 运行 `npm run dev` 命令启动开发服务器
- 等待 Electron 应用启动

### 步骤 4：验证启动
- 检查应用是否正常运行
- 确认所有功能模块加载正常

### 注意事项
- 项目需要 Anthropic API 密钥才能正常使用 AI 功能
- 如果遇到端口占用问题，可能需要修改 Vite 配置