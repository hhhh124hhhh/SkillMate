# Node.js 版本切换指南

## 问题说明

SkillMate 项目要求使用 **Node.js v20.x**，但您的系统当前使用的是 **Node.js v24.12.0**。

### 为什么需要切换？

Node.js v24 改变了 ESM (ECMAScript Modules) 和 CommonJS 的互操作规则，导致以下问题：

1. **MCP SDK 加载失败**
   - 错误: `SyntaxError: The requested module 'electron' does not provide an export named 'BrowserWindow'`
   - 原因: Node.js 24 不允许从 CommonJS 模块进行 ESM 命名导入

2. **某些 MCP 服务器无法启动**
   - `@modelcontextprotocol/server-github` 等服务器使用旧版 SDK (1.0.1)
   - Node.js 24 与旧版 SDK 不兼容

### 当前状态

```bash
$ node --version
v24.12.0  # ❌ 不兼容
```

目标版本：

```bash
$ node --version
v20.x.x   # ✅ 兼容
```

---

## 解决方案

### 方案 1: 使用 nvm (推荐)

**nvm** (Node Version Manager) 是最流行的 Node.js 版本管理工具，支持 macOS、Linux 和 Windows (通过 nvm-windows)。

#### Windows 用户

1. **安装 nvm-windows**

   下载并安装最新的 nvm-windows:
   - 访问: https://github.com/coreybutler/nvm-windows/releases
   - 下载 `nvm-setup.exe`
   - 运行安装程序

2. **卸载当前的 Node.js**

   - 打开 "控制面板" > "程序和功能"
   - 找到 "Node.js" 并卸载

3. **使用 nvm 安装 Node.js 20**

   打开 **命令提示符** 或 **PowerShell** (不是 Git Bash):

   ```cmd
   # 安装 Node.js 20
   nvm install 20

   # 切换到 Node.js 20
   nvm use 20

   # 验证版本
   node --version
   # 应显示: v20.x.x
   ```

4. **设置默认版本**

   ```cmd
   nvm alias default 20
   ```

5. **重新安装项目依赖**

   ```cmd
   cd d:\wechat-flowwork
   rm -rf node_modules
   npm install
   ```

#### macOS / Linux 用户

1. **安装 nvm**

   ```bash
   # 使用 curl
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

   # 或使用 wget
   wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

2. **重新加载 shell 配置**

   ```bash
   source ~/.bashrc  # 或 source ~/.zshrc
   ```

3. **安装并切换到 Node.js 20**

   ```bash
   # 安装 Node.js 20
   nvm install 20

   # 切换到 Node.js 20
   nvm use 20

   # 设置为默认版本
   nvm alias default 20

   # 验证版本
   node --version
   # 应显示: v20.x.x
   ```

4. **重新安装项目依赖**

   ```bash
   cd /path/to/wechat-flowwork
   rm -rf node_modules
   npm install
   ```

---

### 方案 2: 手动安装 Node.js 20

如果不想使用 nvm，可以手动安装 Node.js 20。

#### Windows 用户

1. **下载 Node.js 20 LTS**

   - 访问: https://nodejs.org/en/download
   - 下载 "Node.js 20.x LTS" Windows 安装程序 (.msi)

2. **卸载当前的 Node.js v24**

   - 打开 "控制面板" > "程序和功能"
   - 找到 "Node.js" 并卸载

3. **安装 Node.js 20**

   - 运行下载的 .msi 安装程序
   - 按照提示完成安装

4. **验证版本**

   ```cmd
   node --version
   # 应显示: v20.x.x
   ```

5. **重新安装项目依赖**

   ```cmd
   cd d:\wechat-flowwork
   rm -rf node_modules
   npm install
   ```

#### macOS 用户

使用 Homebrew:

```bash
# 卸载当前版本
brew uninstall node

# 安装 Node.js 20
brew install node@20

# 链接到系统
brew link node@20

# 验证版本
node --version
```

#### Linux 用户

使用 NodeSource 仓库:

```bash
# 移除旧版本
sudo apt remove nodejs

# 添加 NodeSource 仓库 (Node.js 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 安装 Node.js
sudo apt-get install -y nodejs

# 验证版本
node --version
```

---

### 方案 3: 使用 .nvmrc 文件 (自动切换)

项目已包含 `.nvmrc` 文件，指定了 Node.js 版本为 20。

```bash
# 在项目目录下运行
nvm use
# nvm 会自动读取 .nvmrc 并切换到 Node.js 20
```

如果 `.nvmrc` 文件不存在，可以手动创建:

```bash
echo "20" > .nvmrc
```

---

## 验证修复

### 1. 检查 Node 版本

```bash
node --version
# 应显示: v20.x.x
```

### 2. 重新安装依赖

```bash
# 删除旧的依赖
rm -rf node_modules

# 重新安装
npm install
```

### 3. 启动应用

```bash
npm run dev
```

### 4. 检查 MCP 功能

1. 打开应用
2. 进入 "设置" > "MCP"
3. 查看是否有配置健康度提示
4. 如果有配置问题，点击 "一键修复配置"

---

## 常见问题

### Q: 切换版本后仍然报错？

A: 尝试以下步骤:

1. **清理 npm 缓存**
   ```bash
   npm cache clean --force
   ```

2. **删除 node_modules 和 package-lock.json**
   ```bash
   rm -rf node_modules package-lock.json
   ```

3. **重新安装依赖**
   ```bash
   npm install
   ```

4. **重新构建 native 模块**
   ```bash
   npm rebuild
   ```

### Q: nvm 命令找不到？

A:
- **Windows**: 确保使用 **cmd** 或 **PowerShell**，而不是 Git Bash
- **macOS/Linux**: 确保 nvm 已正确安装并重新加载了 shell 配置

### Q: 如何查看已安装的 Node 版本？

A:
```bash
nvm list        # Windows
nvm ls          # macOS/Linux
```

### Q: 如何在多个版本间切换？

A:
```bash
nvm use 20      # 切换到 Node.js 20
nvm use 22      # 切换到 Node.js 22
```

---

## 长期解决方案

### 1. 在项目中锁定 Node 版本

项目已包含 `.nvmrc` 文件，但也可以在 `package.json` 中添加 `engines` 字段:

```json
{
  "engines": {
    "node": ">=20.0.0 <21.0.0"
  }
}
```

### 2. 在 CI/CD 中验证 Node 版本

```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - name: Check Node version
        run: |
          node_version=$(node -v)
          if [[ !$node_version =~ ^v20\. ]]; then
            echo "Node.js 20.x required, but found $node_version"
            exit 1
          fi
```

### 3. 添加启动前检查

创建 `scripts/check-node-version.js`:

```javascript
const requiredMajor = 20;
const currentVersion = process.version;
const currentMajor = parseInt(currentVersion.slice(1).split('.')[0]);

if (currentMajor !== requiredMajor) {
  console.error(`\n❌ Node.js v${requiredMajor} required, but found ${currentVersion}`);
  console.error('请运行: nvm use 20\n');
  process.exit(1);
}

console.log(`✅ Node.js version: ${currentVersion}`);
```

在 `package.json` 中添加:

```json
{
  "scripts": {
    "predev": "node scripts/check-node-version.js"
  }
}
```

---

## 参考资料

- [nvm GitHub](https://github.com/nvm-sh/nvm)
- [nvm-windows GitHub](https://github.com/coreybutler/nvm-windows)
- [Node.js 官方下载](https://nodejs.org/en/download)
- [Node.js ESM/CommonJS 互操作](https://nodejs.org/api/esm.html)
- [项目 CLAUDE.md](./CLAUDE.md) - 开发环境要求

---

**最后更新**: 2026-01-25
**维护者**: SkillMate 开发团队
