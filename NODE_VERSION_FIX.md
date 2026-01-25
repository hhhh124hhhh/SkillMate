# Node.js 版本问题修复

## 问题诊断

**错误信息**:
```
SyntaxError: The requested module 'electron' does not provide an export named 'BrowserWindow'
```

**根本原因**:
当前环境使用 Node.js v24.12.0，但项目配置是为 Node.js 20 设计的。

Node.js 24 对 ESM/CommonJS 互操作的处理更严格，导致无法从 CommonJS 模块（electron）进行 ESM 命名导入。

## 解决方案

### 方案 1: 使用 Node.js 20（推荐）

**Windows (使用 nvm-windows)**:
```powershell
# 安装 Node.js 20
nvm install 20

# 切换到 Node.js 20
nvm use 20

# 验证版本
node --version  # 应该显示 v20.x.x

# 重新运行项目
npm run dev
```

**macOS/Linux (使用 nvm)**:
```bash
# 安装 Node.js 20
nvm install 20

# 切换到 Node.js 20
nvm use 20

# 验证版本
node --version  # 应该显示 v20.x.x

# 重新运行项目
npm run dev
```

### 方案 2: 使用 Docker

创建 `Dockerfile`:
```dockerfile
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

CMD ["npm", "run", "dev"]
```

### 方案 3: 修改项目以支持 Node.js 24（复杂，不推荐）

需要以下修改：
1. 移除 `package.json` 中的 `"type": "module"`
2. 将所有 ESM 导入改为 CommonJS
3. 修改 vite.config.ts 配置
4. 更新所有源文件的导入语句

**预计工作量**: 2-3 小时
**风险**: 可能引入新的兼容性问题

## 验证

切换到 Node.js 20 后，运行：
```bash
node --version  # 应该显示 v20.x.x
npm run dev     # 应该正常启动
```

## 相关文件

- `.nvmrc` - 指定项目需要的 Node 版本（20）
- `package.json` - 添加了 `engines` 字段限制 Node 版本
