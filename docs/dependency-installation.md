# 技能依赖安装指南

本指南提供 AI Agent Desktop 技能系统所需依赖的安装说明。

---

## 📋 目录

1. [Python 环境准备](#python-环境准备)
2. [依赖安装方式](#依赖安装方式)
3. [按类别安装](#按类别安装)
4. [一键安装所有依赖](#一键安装所有依赖)
5. [故障排查](#故障排查)

---

## Python 环境准备

### 检查 Python 版本

AI Agent Desktop 需要 Python 3.8 或更高版本：

```bash
# 检查 Python 版本
python --version

# 或
python3 --version
```

如果未安装 Python，请从 [Python 官网](https://www.python.org/downloads/) 下载安装。

### Windows 安装 Python

1. 下载 Python 3.8+ 安装包
2. 运行安装程序，**勾选 "Add Python to PATH"**
3. 安装完成后重启终端
4. 验证安装：`python --version`

### macOS 安装 Python

```bash
# 使用 Homebrew
brew install python@3.11

# 验证安装
python3 --version
```

### Linux 安装 Python

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip

# Fedora
sudo dnf install python3 python3-pip

# 验证安装
python3 --version
```

---

## 依赖安装方式

### 方式一：全局安装（推荐用于开发）

```bash
pip install <package-name>
```

**优点**:
- 所有项目共享
- 安装快速

**缺点**:
- 可能与其他项目冲突
- 需要管理员权限（Linux/macOS）

### 方式二：虚拟环境（推荐用于生产）

```bash
# 创建虚拟环境
python -m venv aiagent-env

# 激活虚拟环境
# Windows
aiagent-env\Scripts\activate
# macOS/Linux
source aiagent-env/bin/activate

# 安装依赖
pip install <package-name>
```

**优点**:
- 隔离项目依赖
- 避免版本冲突

**缺点**:
- 需要手动激活环境

### 方式三：应用内置 Python（推荐）

AI Agent Desktop 内置了 Python 运行时，无需系统安装 Python。

**依赖安装位置**:
```
python-runtime/Lib/site-packages/
```

**安装命令**:
```bash
# 使用应用内置 Python
python-runtime/python.exe -m pip install <package-name>
```

---

## 按类别安装

### 📚 文档处理类

#### PDF 处理

```bash
pip install pypdf pdfplumber
```

**功能**:
- 提取 PDF 文本
- 分析 PDF 结构
- 合并/拆分 PDF

#### Excel 处理

```bash
pip install openpyxl pandas matplotlib
```

**功能**:
- 读取/写入 Excel 文件
- 数据分析
- 数据可视化

#### PowerPoint 处理

```bash
pip install python-pptx
```

**功能**:
- 创建演示文稿
- 编辑幻灯片
- 添加图表

#### Word 处理

**方式一：使用 python-docx**

```bash
pip install python-docx
```

**方式二：使用 Pandoc**

1. 下载 [Pandoc](https://pandoc.org/installing.html)
2. 验证安装：`pandoc --version`

#### CSV 处理

```bash
pip install pandas matplotlib
```

**功能**:
- CSV 数据分析
- 统计报告
- 数据可视化

---

### 🎨 设计创作类

#### 图片处理

```bash
pip install Pillow
```

**功能**:
- 图片裁剪、缩放
- 格式转换
- 滤镜效果

#### 算法艺术

```bash
pip install p5
```

**可选**: 使用在线 p5.js 编辑器（无需安装）

---

### 🛠️ 开发工具类

#### Web 应用测试

```bash
pip install playwright
playwright install
```

**功能**:
- 自动化浏览器测试
- 截图和录屏
- 表单填写

**浏览器安装**:
```bash
playwright install chromium
playwright install firefox
playwright install webkit
```

#### MCP 构建工具

```bash
pip install fastmcp
# 或
npm install @modelcontextprotocol/sdk
```

---

### 🔧 其他工具

#### 数据分析

```bash
pip install pandas numpy matplotlib seaborn
```

#### 自然语言处理

```bash
pip install nltk spacy
```

#### 网络请求

```bash
pip install requests aiohttp
```

---

## 一键安装所有依赖

### 完整安装（所有技能）

```bash
# 文档处理
pip install pypdf pdfplumber openpyxl pandas matplotlib python-pptx python-docx

# 设计创作
pip install Pillow p5

# 开发工具
pip install playwright
playwright install

# 其他
pip install requests aiohttp
```

### 最小化安装（核心技能）

```bash
# 仅安装最常用的依赖
pip install pandas matplotlib Pillow
```

### 批量安装（从 requirements.txt）

创建 `requirements.txt`:

```txt
# 文档处理
pypdf==3.17.0
pdfplumber==0.10.3
openpyxl==3.1.2
pandas==2.1.4
matplotlib==3.8.2
python-pptx==0.6.23
python-docx==1.1.0

# 设计创作
Pillow==10.2.0

# 开发工具
playwright==1.40.0

# 其他
requests==2.31.0
aiohttp==3.9.1
```

安装:

```bash
pip install -r requirements.txt
playwright install
```

---

## 故障排查

### 问题 1: pip 不是内部或外部命令

**原因**: Python 未添加到 PATH

**解决方案**:
1. **Windows**: 重新安装 Python，勾选 "Add Python to PATH"
2. **macOS/Linux**: 使用 `python3 -m pip` 替代 `pip`

### 问题 2: 权限错误

**错误信息**:
```
Permission denied: '/usr/local/lib/python3.11/site-packages'
```

**解决方案**:

**方案一**: 使用虚拟环境（推荐）

**方案二**: 使用 `--user` 标志
```bash
pip install --user <package-name>
```

**方案三**: 使用 sudo（Linux/macOS）
```bash
sudo pip install <package-name>
```

### 问题 3: 版本冲突

**错误信息**:
```
ERROR: pip's dependency resolver does not currently take into account all the packages that are installed.
```

**解决方案**:

**方案一**: 升级 pip
```bash
pip install --upgrade pip
```

**方案二**: 使用虚拟环境隔离项目

**方案三**: 强制重装
```bash
pip install --force-reinstall <package-name>
```

### 问题 4: SSL 证书错误

**错误信息**:
```
 SSL: CERTIFICATE_VERIFY_FAILED
```

**解决方案**:

**Windows**:
1. 下载 [certifi.pem](https://curl.se/ca/cacert.pem)
2. 设置环境变量：
   ```
   set SSL_CERT_FILE=C:\path\to\cacert.pem
   ```

**macOS/Linux**:
```bash
# 安装证书
pip install certifi
```

### 问题 5: Playwright 浏览器下载失败

**错误信息**:
```
ERROR: Failed to download Chromium
```

**解决方案**:

**设置镜像源（中国大陆）**:
```bash
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
playwright install
```

**或使用国内镜像**:
```bash
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/ pip install playwright
```

### 问题 6: 依赖安装后技能仍不可用

**排查步骤**:

1. **检查 Python 版本**:
   ```bash
   python --version  # 需要 3.8+
   ```

2. **验证依赖已安装**:
   ```bash
   pip list | grep pandas
   ```

3. **测试导入**:
   ```bash
   python -c "import pandas; print(pandas.__version__)"
   ```

4. **查看技能日志**:
   - 打开应用
   - 查看终端输出中的错误信息

5. **重启应用**:
   - 退出应用
   - 重新启动

---

## 📦 依赖版本锁定

为了保证稳定性，建议锁定依赖版本：

### 使用 pip freeze

```bash
# 生成当前环境的依赖列表
pip freeze > requirements-lock.txt

# 安装锁定版本的依赖
pip install -r requirements-lock.txt
```

### 使用 pip-tools

```bash
# 安装 pip-tools
pip install pip-tools

# 编译依赖
pip-compile requirements.in

# 安装编译后的依赖
pip-sync requirements.txt
```

---

## 🔐 安全建议

1. **从官方源安装**: 使用 PyPI 官方源，避免第三方源
2. **验证包完整性**: 检查包的哈希值
3. **定期更新**: `pip install --upgrade <package>`
4. **审计依赖**: `pip-audit` (需要安装: `pip install pip-audit`)

---

## 📚 相关文档

- [技能索引](./skills-index.md)
- [技能开发指南](./skill-development.md)
- [MCP 集成指南](./mcp-integration.md)

---

**最后更新**: 2025-01-21
**版本**: 1.0.0
