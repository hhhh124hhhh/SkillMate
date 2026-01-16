# 方案：添加生图 API 配置

为了支持 Skills 调用生图功能（特别是 `image-generation` skill），我们需要在设置中添加豆包生图 API Key 的配置项，并将其传递给后端的 Skill 执行环境。

## 1. 后端配置存储 (`ConfigStore.ts`)

*   **修改 `AppConfig` 接口**: 增加 `doubaoApiKey` 字段。
*   **修改 `ConfigStore` 类**:
    *   添加 `getDoubaoApiKey()` 和 `setDoubaoApiKey()` 方法。
    *   支持从环境变量 `DOUBAO_API_KEY` 读取默认值。

## 2. 前端设置界面 (`SettingsView.tsx`)

*   **UI 变更**: 在“通用”设置页面的 API Key 下方，添加一个新的输入框 "豆包生图 API Key"。
*   **状态管理**: 在 `Config` 接口和 `config` 状态中添加 `doubaoApiKey`。
*   **交互**: 允许用户输入和保存该 Key。

## 3. Skill 执行环境注入 (`AgentRuntime.ts`)

虽然 Skill 本身（如 `doubao_image_gen.py`）已经支持从环境变量读取 Key，我们需要确保 Electron 主进程在运行这些 Python 脚本时，将配置中的 Key 注入到环境变量中。

*   **机制**: `AgentRuntime` 在执行 `run_command` 工具时，通常会继承 `process.env`。我们需要确保 `configStore.getDoubaoApiKey()` 的值被添加到这个环境变量中（如果用户配置了的话）。
    *   *注：* 实际上 `AgentRuntime` 调用 `run_command` 时，如果 Python 脚本内部使用了 `os.getenv`，只要我们在主进程启动时或者执行命令时设置了 env 即可。
    *   **更稳健的做法**: 修改 `AgentRuntime` 的 `runLoop` 或工具执行逻辑，在调用 `run_command` 时显式注入 `DOUBAO_API_KEY` 环境变量。

## 4. 实施步骤

1.  **后端**: 更新 `electron/config/ConfigStore.ts`。
2.  **前端**: 更新 `src/components/SettingsView.tsx`。
3.  **连接**: 确保 `AgentRuntime` 或 `main.ts` 在初始化时将配置的 Key 放入 `process.env`，或者在执行 Skill 时注入。鉴于 `image-generation` skill 脚本通过 `os.getenv('DOUBAO_API_KEY')` 读取，最简单的方法是在 `main.ts` 的 `initializeAgent` 或 `ipcMain.handle('config:set-all')` 中同步更新 `process.env.DOUBAO_API_KEY`。

## 预期效果
用户在设置界面填入豆包 API Key 后，调用生图 Skill 时将自动使用该 Key，无需手动修改 Python 脚本或设置系统环境变量。
