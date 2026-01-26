import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';  // 🔧 添加同步 fs 模块用于 existsSync
import os from 'os';
import log from 'electron-log';
// app import removed

export interface MCPServerConfig {
    name: string;
    type?: 'stdio' | 'streamableHttp';
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    description?: string;
    baseUrl?: string;
    headers?: Record<string, string>;
    disabled?: boolean;  // 是否禁用此服务器
    isCustom?: boolean;  // 标识是否为自定义服务器
    _preinstalled?: boolean;  // 标识是否为预装服务器
}

export interface MCPConfig {
    mcpServers: Record<string, MCPServerConfig>;
    customServers?: Record<string, MCPServerConfig>;  // 用户自定义服务器
}

export interface MCPServerStatus {
    name: string;
    connected: boolean;
    error?: string;
    retryCount?: number;
}

export class MCPClientService {
    private clients: Map<string, Client> = new Map();
    private configPath: string;
    private retryAttempts: Map<string, number> = new Map();
    private readonly MAX_RETRIES = 2;
    private connectionStatus: Map<string, MCPServerStatus> = new Map();

    constructor() {
        // Always read from user config directory
        const configDir = path.join(os.homedir(), '.aiagent');
        this.configPath = path.join(configDir, 'mcp.json');

        log.log('[MCPClientService] Using config path:', this.configPath);
    }

    /**
     * 检测配置中的占位符
     * @returns 需要修复的服务器列表
     */
    private detectPlaceholders(config: MCPConfig): string[] {
        const placeholders: string[] = [];

        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
            // 1. 检查 args 中的占位符
            if (serverConfig.args) {
                for (const arg of serverConfig.args) {
                    if (arg.includes('ALLOWED_') || arg.includes('YOUR_')) {
                        placeholders.push(`${name}:args:${arg}`);
                    }
                }
            }

            // 2. 检查 env 中的占位符
            if (serverConfig.env) {
                for (const [key, value] of Object.entries(serverConfig.env)) {
                    if (this.isPlaceholder(value)) {
                        placeholders.push(`${name}:env:${key}`);
                    }
                }
            }

            // 3. ✨ 检查 headers 中的占位符（新增）
            if (serverConfig.headers) {
                for (const [key, value] of Object.entries(serverConfig.headers)) {
                    if (this.isPlaceholder(value)) {
                        placeholders.push(`${name}:headers:${key}`);
                    }
                }
            }
        }

        return placeholders;
    }

    /**
     * 判断是否为占位符
     * @param value 待检查的值
     * @returns 是否为占位符
     */
    private isPlaceholder(value: string): boolean {
        if (!value || typeof value !== 'string') return false;
        return value.includes('YOUR_') ||
               value.includes('API_KEY_HERE') ||
               value.includes('API密钥') ||
               value.includes('TOKEN_HERE');
    }

    /**
     * 自动替换文件系统路径
     * @returns 是否成功替换
     */
    private async replaceFilesystemPath(config: MCPConfig): Promise<boolean> {
        const filesystemConfig = config.mcpServers['filesystem'];
        if (!filesystemConfig || !filesystemConfig.args) {
            return false;
        }

        const allowedPathIndex = filesystemConfig.args.findIndex(
            arg => arg === 'ALLOWED_PATH'
        );

        if (allowedPathIndex === -1) {
            return false;
        }

        let replacementPath: string;

        try {
            // 尝试从 ConfigStore 获取授权文件夹
            const { configStore } = await import('../../config/ConfigStore.js');
            const authorizedFolders = configStore.getAuthorizedFolders();

            if (authorizedFolders && authorizedFolders.length > 0) {
                // 使用第一个授权文件夹
                replacementPath = authorizedFolders[0];
                log.log('[MCPClientService] Using authorized folder:', replacementPath);
            } else {
                // 使用用户主目录作为安全的默认路径
                replacementPath = os.homedir();
                log.log('[MCPClientService] Using home directory as default:', replacementPath);
            }
        } catch (error) {
            // 如果 ConfigStore 加载失败，使用用户主目录
            replacementPath = os.homedir();
            log.warn('[MCPClientService] Failed to load ConfigStore, using home directory:', replacementPath);
        }

        // 替换占位符
        filesystemConfig.args[allowedPathIndex] = replacementPath;

        // 保存更新后的配置
        try {
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
            log.log('[MCPClientService] ✅ Replaced ALLOWED_PATH with:', replacementPath);
            return true;
        } catch (error) {
            log.error('[MCPClientService] Failed to save config:', error);
            return false;
        }
    }

    /**
     * 处理 API Key 占位符
     * 标记未配置的服务器为禁用状态，而不是删除它们
     * 这样用户可以看到需要配置的服务器并手动启用
     */
    private async markServersWithPlaceholders(config: MCPConfig): Promise<void> {
        let hasChanges = false;

        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
            let hasInvalidKey = false;

            // 1. 检查 env 中的占位符
            if (serverConfig.env) {
                for (const [key, value] of Object.entries(serverConfig.env)) {
                    if (this.isPlaceholder(value)) {
                        log.warn(`[MCPClientService] ⚠️ ${name} requires env.${key} to be configured`);
                        hasInvalidKey = true;
                    }
                }
            }

            // 2. ✨ 检查 headers 中的占位符（新增）
            if (serverConfig.headers) {
                for (const [key, value] of Object.entries(serverConfig.headers)) {
                    if (this.isPlaceholder(value)) {
                        log.warn(`[MCPClientService] ⚠️ ${name} requires header.${key} to be configured`);
                        hasInvalidKey = true;
                    }
                }
            }

            // 标记为禁用（而不是删除）
            if (hasInvalidKey) {
                serverConfig.disabled = true;
                log.log(`[MCPClientService] 🚫 Disabled ${name} due to missing credentials`);
                hasChanges = true;
            }
        }

        // 保存更新后的配置
        if (hasChanges) {
            try {
                await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
                log.log('[MCPClientService] ✅ Updated config after marking servers with placeholders');
            } catch (error) {
                log.error('[MCPClientService] Failed to save config:', error);
            }
        }
    }

    async loadClients() {
        let config: MCPConfig = { mcpServers: {} };
        let needsRepair = false;

        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            config = JSON.parse(content);

            // ✅ 检查配置完整性
            needsRepair = this.detectIncompleteConfig(config);
            if (needsRepair) {
                log.warn('[MCPClientService] ⚠️ Detected incomplete or empty user config, will repair');
            }
        } catch (e) {
            // 文件不存在，从模板创建
            log.log('[MCPClientService] Creating default MCP config from template');
            const templatePath = path.join(process.env.APP_ROOT || process.cwd(), 'resources', 'mcp-templates.json');

            try {
                const template = await fs.readFile(templatePath, 'utf-8');
                await fs.mkdir(path.dirname(this.configPath), { recursive: true });
                await fs.writeFile(this.configPath, template, 'utf-8');
                config = JSON.parse(template);
                log.log('[MCPClientService] Created default config from template');
            } catch (templateError) {
                log.error('[MCPClientService] Failed to load template:', templateError);
            }
        }

        if (!config.mcpServers) {
            config.mcpServers = {};
        }

        // ✅ 智能合并配置（从模板添加缺失的服务器）
        if (needsRepair || Object.keys(config.mcpServers).length === 0) {
            config = await this.repairAndMergeConfig(config);
        }

        // 🔧 检测并修复占位符
        const placeholders = this.detectPlaceholders(config);
        if (placeholders.length > 0) {
            log.log('[MCPClientService] 🔍 Detected placeholders:', placeholders);

            // 修复文件系统路径
            const filesystemFixed = await this.replaceFilesystemPath(config);
            if (filesystemFixed) {
                log.log('[MCPClientService] ✅ Filesystem path fixed');
            }

            // 处理 API Key 占位符，标记为禁用
            await this.markServersWithPlaceholders(config);
        } else {
            log.log('[MCPClientService] ✅ No placeholders found, config is valid');
        }

        // 连接所有服务器
        for (const [key, serverConfig] of Object.entries(config.mcpServers || {})) {
            // 跳过被禁用的服务器
            if (serverConfig.disabled) {
                log.log(`[MCPClientService] ⏭️  Skipping disabled server: ${key}`);
                continue;
            }
            await this.connectToServer(key, serverConfig);
        }
    }

    /**
     * 获取所有已连接的 MCP 客户端
     * @returns 客户端 Map
     */
    getClients(): Map<string, Client> {
        return this.clients;
    }

    /**
     * 获取所有 MCP 服务器的连接状态
     * @returns 服务器状态数组
     */
    getConnectionStatus(): MCPServerStatus[] {
        return Array.from(this.connectionStatus.values());
    }

    private async connectToServer(name: string, config: MCPServerConfig, retryCount: number = 0): Promise<void> {
        if (this.clients.has(name)) return;

        // 初始化状态为连接中
        this.connectionStatus.set(name, {
            name,
            connected: false,
            retryCount
        });

        try {
            let transport;

            log.log(`Connecting to MCP server: ${name}, type: ${config.type}, baseUrl: ${config.baseUrl}`);

            if (config.type === 'streamableHttp' && config.baseUrl) {
                // HTTP transport
                log.log(`Using HTTP transport for MCP server: ${name} at ${config.baseUrl}`);
                transport = new StreamableHTTPClientTransport(new URL(config.baseUrl), {
                    requestInit: {
                        headers: config.headers || {}
                    }
                });
            } else if (config.command) {
                // Stdio transport
                log.log(`Using stdio transport for MCP server: ${name}`);
                const finalEnv = { ...(process.env as Record<string, string>), ...config.env };

                // 🔧 解析相对路径为绝对路径
                let resolvedCommand = config.command;
                const resolvedArgs = config.args || [];

                // 如果是预装的 MCP 服务器，需要解析路径
                if (config._preinstalled && config.args?.[0]?.includes('node_modules')) {
                    log.log(`[MCP] Resolving preinstalled MCP server path for ${name}`);

                    // 获取应用根目录
                    const appRoot = process.env.APP_ROOT || process.cwd();
                    log.log(`[MCP] App root: ${appRoot}`);

                    // 解析 node_modules 路径
                    const modulePath = path.resolve(appRoot, config.args[0]);
                    log.log(`[MCP] Resolved module path: ${modulePath}`);

                    // 检查文件是否存在
                    if (fsSync.existsSync(modulePath)) {
                        resolvedArgs[0] = modulePath;
                        log.log(`[MCP] ✅ Module path resolved successfully`);
                    } else {
                        throw new Error(`MCP server module not found: ${modulePath}`);
                    }
                }

                // 🔧 如果是预装的 Python MCP 服务器，自动设置 PYTHONPATH
                if (config._preinstalled && config.command === 'python') {
                    log.log(`[MCP] Resolving preinstalled Python MCP server path for ${name}`);

                    // 获取应用根目录
                    const appRoot = process.env.APP_ROOT || process.cwd();
                    const pythonRuntimePath = path.join(appRoot, 'python-runtime');
                    const pythonLibPath = path.join(pythonRuntimePath, 'lib');
                    const pythonExePath = path.join(pythonRuntimePath, 'python.exe');

                    // 检查 python-runtime 是否存在
                    if (fsSync.existsSync(pythonExePath) && fsSync.existsSync(pythonLibPath)) {
                        // 使用嵌入式 Python
                        resolvedCommand = pythonExePath;  // 替换 command
                        finalEnv['PYTHONPATH'] = pythonLibPath;
                        log.log(`[MCP] Using embedded Python: ${pythonExePath}`);
                        log.log(`[MCP] PYTHONPATH: ${pythonLibPath}`);
                    } else {
                        log.warn(`[MCP] python-runtime not found at ${pythonRuntimePath}, falling back to system Python`);
                    }
                }

                // [Restored] Sync API Key from ConfigStore if Base URL matches MiniMax
                // This allows users to use the app's configured key without duplicating it in mcp.json
                const { configStore } = await import('../../config/ConfigStore.js'); // Dynamic import to avoid cycles if any
                const appApiKey = await configStore.getApiKey();
                const appApiUrl = configStore.getApiUrl() || '';

                // Check if we should inject the app's key
                if (name === 'MiniMax' && appApiUrl.includes('minimax') && appApiKey) {
                    // Only override if the config env key is placeholder or missing
                    const configKey = config.env?.MINIMAX_API_KEY;
                    if (!configKey || configKey === "YOUR_API_KEY_HERE" || configKey.includes("API密钥")) {
                        log.log('Injecting App API Key for MiniMax MCP Server');
                        finalEnv['MINIMAX_API_KEY'] = appApiKey;
                    }
                }

                transport = new StdioClientTransport({
                    command: resolvedCommand,
                    args: resolvedArgs,
                    env: finalEnv
                });
            } else {
                log.error(`Invalid MCP server config for ${name}: missing required fields`);
                return;
            }

            const client = new Client({
                name: "opencowork-client",
                version: "1.0.0",
            }, {
                capabilities: {
                    // Start with empty capabilities
                },
            });

            await client.connect(transport, {
                timeout: 120000,  // 2 分钟超时（本地启动很快，但留个保险）
                maxTotalTimeout: 180000  // 最大总超时 3 分钟
            });

            // 保存客户端引用
            this.clients.set(name, client);

            // 成功连接，清除重试计数
            this.retryAttempts.delete(name);

            // 更新状态为已连接
            this.connectionStatus.set(name, {
                name,
                connected: true,
                retryCount: 0
            });

            // 安全地记录日志 - 捕获 EPIPE 错误
            try {
                log.log(`[MCP] ✅ Connected to ${name}`);
            } catch (logError) {
                // 忽略日志错误，可能是进程已终止
                if ((logError as NodeJS.ErrnoException).code !== 'EPIPE') {
                    log.error(`Failed to log connection success for ${name}:`, logError);
                }
            }
        } catch (e) {
            const error = e as Error;

            // 如果是临时性错误，尝试重试
            if (retryCount < this.MAX_RETRIES && this.isRetryableError(error)) {
                const currentAttempt = retryCount + 1;
                this.retryAttempts.set(name, currentAttempt);

                log.warn(`[MCP] ⚠️ Connection to ${name} failed (attempt ${currentAttempt}/${this.MAX_RETRIES + 1})`);
                log.warn(`  Error: ${error.message}`);
                log.log(`[MCP] 🔄 Retrying in 3 seconds...`);

                // 等待 3 秒后重试
                await new Promise(resolve => setTimeout(resolve, 3000));
                return this.connectToServer(name, config, currentAttempt);
            }

            // 重试失败或不可重试的错误，更新状态为连接失败
            this.connectionStatus.set(name, {
                name,
                connected: false,
                error: error.message,
                retryCount
            });

            log.error(`[MCP] ❌ Failed to connect to ${name} after ${retryCount + 1} attempts:`);
            log.error(`  Error: ${error.message}`);

            // ✨ 增强的诊断建议：精细化错误分类
            if (error.message.includes('401') || error.message.includes('403')) {
                // 认证错误
                log.error(`[MCP] 🔐 Authentication failed for ${name}`);
                log.error(`  💡 建议: 检查 API Key 是否正确`);
                log.error(`  💡 路径: 设置 > MCP > ${name} > Headers/Environment`);
            } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                // 网络错误
                log.error(`[MCP] 🌐 Network error for ${name}`);
                log.error(`  💡 建议: 检查网络连接或服务器 URL`);
            } else if (error.message.includes('Connection closed') || error.message.includes('ECONNRESET')) {
                // 连接关闭 - 检查是否为占位符导致
                if (this.hasUnresolvedPlaceholders(config)) {
                    log.error(`[MCP] ⚠️ Configuration error for ${name}`);
                    log.error(`  💡 原因: 检测到未配置的占位符 (如 YOUR_JINA_API_KEY, YOUR_BRAVE_API_KEY)`);
                    log.error(`  💡 建议: 在设置面板中配置有效的 API Key`);
                } else {
                    log.error(`  💡 建议: MCP 服务器进程启动失败或意外退出`);
                    if (config.command) {
                        log.error(`  💡 尝试手动运行: ${config.command} ${config.args?.join(' ')}`);
                    }
                }
            } else if (error.message.includes('EACCES') || error.message.includes('权限')) {
                log.error(`  💡 建议: 检查应用是否有足够权限启动子进程`);
            } else if (error.message.includes('ENOENT')) {
                log.error(`  💡 建议: 确保 ${config.command} 已正确安装`);
            } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
                log.error(`  💡 建议: 网络连接可能较慢，请检查网络或稍后重试`);
            } else {
                log.error(`  💡 建议: 尝试手动运行 ${config.command} ${config.args?.join(' ')} 查看详细错误`);
            }
        }
    }

    async getTools(): Promise<{ name: string; description?: string; input_schema: Record<string, unknown> }[]> {
        const allTools: { name: string; description?: string; input_schema: Record<string, unknown> }[] = [];

        for (const [name, client] of this.clients) {
            try {
                const toolsList = await client.listTools();
                const tools = toolsList.tools.map(t => ({
                    name: `${name}__${t.name}`, // Namespacing tools
                    description: t.description,
                    input_schema: t.inputSchema as Record<string, unknown>
                }));
                allTools.push(...tools);
            } catch (e) {
                log.error(`Error listing tools for ${name}:`, e);
            }
        }
        return allTools;
    }

    async callTool(name: string, args: Record<string, unknown>) {
        // Parse namespaced tool name "server__tool"
        const [serverName, toolName] = name.split('__');
        const client = this.clients.get(serverName);
        if (!client) throw new Error(`MCP Server ${serverName} not found`);

        // Auto-inject current date for aisearch-mcp-server to ensure time accuracy
        let modifiedArgs = { ...args };
        if (serverName === 'aisearch-mcp-server' && toolName === 'chatCompletions') {
            const currentDate = this.getCurrentDate();
            const prompt = args.prompt as string || '';

            // 🔍 Detailed logging for diagnosis
            log.log(`[MCPClientService] 📥 Received tool call: ${serverName}__${toolName}`);
            log.log(`[MCPClientService] 📝 Original prompt (first 150 chars): ${prompt.substring(0, 150)}...`);

            // Precise date detection using regex to avoid false positives
            // Only skip injection if prompt contains a complete date format
            const hasCompleteDate = /\d{4}年\d{1,2}月\d{1,2}日/.test(prompt);  // "2026年01月16日"
            const hasDashDate = /\d{4}-\d{1,2}-\d{1,2}/.test(prompt);           // "2026-01-16"
            const hasSlashDate = /\d{4}\/\d{1,2}\/\d{1,2}/.test(prompt);       // "2026/01/16"
            const hasKeyword = prompt.includes('当前日期');                      // "当前日期" keyword
            const hasPrefixedDate = /当前日期：\d{4}年/.test(prompt);          // "当前日期：2026年"

            const hasDateAlready = hasCompleteDate || hasDashDate || hasSlashDate || hasKeyword || hasPrefixedDate;

            // 🔍 Log detection results
            log.log(`[MCPClientService] 🔍 Date detection results:`);
            log.log(`  - Complete date (YYYY年MM月DD日): ${hasCompleteDate}`);
            log.log(`  - Dash date (YYYY-MM-DD): ${hasDashDate}`);
            log.log(`  - Slash date (YYYY/MM/DD): ${hasSlashDate}`);
            log.log(`  - Keyword '当前日期': ${hasKeyword}`);
            log.log(`  - Prefixed date: ${hasPrefixedDate}`);
            log.log(`  - Final decision (hasDateAlready): ${hasDateAlready}`);

            if (!hasDateAlready) {
                modifiedArgs = {
                    ...args,
                    prompt: `【当前日期：${currentDate}】\n\n${prompt}`
                };
                log.log(`[MCPClientService] ✅ Auto-injected current date: ${currentDate}`);
                log.log(`[MCPClientService] 📤 Final prompt (first 150 chars): ${(modifiedArgs.prompt as string).substring(0, 150)}...`);
            } else {
                const reason = [];
                if (hasCompleteDate) reason.push('complete date format');
                if (hasDashDate) reason.push('dash date format');
                if (hasSlashDate) reason.push('slash date format');
                if (hasKeyword) reason.push('"当前日期" keyword');
                if (hasPrefixedDate) reason.push('prefixed date format');
                log.log(`[MCPClientService] ⏭️ Skipping injection, reason: ${reason.join(', ')}`);
                log.log(`[MCPClientService] 📤 Prompt unchanged (first 150 chars): ${prompt.substring(0, 150)}...`);
            }
        }

        const result = await client.callTool({
            name: toolName,
            arguments: modifiedArgs
        });

        // Convert MCP result to Anthropic ToolResult
        return JSON.stringify(result);
    }

    private getCurrentDate(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}年${month}月${day}日`;
    }

    private isRetryableError(error: Error): boolean {
        const retryablePatterns = [
            /timeout/i,
            /ECONNREFUSED/i,
            /ECONNRESET/i,
            /Connection closed/i,
            /ETIMEDOUT/i
        ];

        return retryablePatterns.some(pattern => pattern.test(error.message));
    }

    /**
     * 检查服务器配置是否包含未解析的占位符
     * @param serverConfig 服务器配置
     * @returns 是否包含占位符
     */
    private hasUnresolvedPlaceholders(serverConfig: MCPServerConfig): boolean {
        // 检查 env
        if (serverConfig.env) {
            for (const value of Object.values(serverConfig.env)) {
                if (this.isPlaceholder(value)) {
                    return true;
                }
            }
        }

        // 检查 headers
        if (serverConfig.headers) {
            for (const value of Object.values(serverConfig.headers)) {
                if (this.isPlaceholder(value)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 重新连接到指定的 MCP 服务器
     * @param name 服务器名称
     * @returns 是否连接成功
     */
    async reconnectServer(name: string): Promise<boolean> {
        try {
            log.log(`[MCP] 🔄 Manual reconnection requested for ${name}`);

            // 关闭现有连接
            const existingClient = this.clients.get(name);
            if (existingClient) {
                await existingClient.close();
                this.clients.delete(name);
            }

            // 清除重试计数
            this.retryAttempts.delete(name);

            // 重新加载配置
            const content = await fs.readFile(this.configPath, 'utf-8');
            const config: MCPConfig = JSON.parse(content);

            const serverConfig = config.mcpServers[name];
            if (!serverConfig) {
                log.error(`[MCP] Server ${name} not found in config`);
                return false;
            }

            // 重新连接
            await this.connectToServer(name, serverConfig);

            const success = this.clients.has(name);
            if (success) {
                log.log(`[MCP] ✅ Successfully reconnected to ${name}`);
            } else {
                log.log(`[MCP] ❌ Failed to reconnect to ${name}`);
            }

            return success;
        } catch (e) {
            log.error(`[MCP] Failed to reconnect ${name}:`, e);
            return false;
        }
    }

    /**
     * 重新加载所有 MCP 服务器配置
     * 用于配置保存后的热重载，无需重启应用
     */
    async reloadAllServers(): Promise<void> {
        log.log('[MCPClientService] 🔄 Reloading all MCP servers...');

        try {
            // 1. 关闭所有现有连接
            for (const [name, client] of this.clients.entries()) {
                await client.close();
                log.log(`[MCPClientService] ✓ Closed connection to ${name}`);
            }
            this.clients.clear();

            // 2. 清除状态
            this.connectionStatus.clear();
            this.retryAttempts.clear();

            // 3. 重新加载配置并连接
            await this.loadClients();

            log.log('[MCPClientService] ✅ Successfully reloaded all servers');
        } catch (error) {
            log.error('[MCPClientService] ❌ Failed to reload servers:', error);
            throw error;
        }
    }

    /**
     * 添加自定义 MCP 服务器
     * @param name 服务器名称
     * @param config 服务器配置
     * @returns 是否添加成功
     */
    async addCustomServer(name: string, config: MCPServerConfig): Promise<boolean> {
        try {
            log.log(`[MCPClientService] ➕ Adding custom server: ${name}`);

            // 读取当前配置
            let currentConfig: MCPConfig = { mcpServers: {} };
            try {
                const content = await fs.readFile(this.configPath, 'utf-8');
                currentConfig = JSON.parse(content);
            } catch (e) {
                log.warn('[MCPClientService] No existing config, creating new one');
            }

            // 确保 customServers 字段存在
            if (!currentConfig.customServers) {
                currentConfig.customServers = {};
            }

            // 标记为自定义服务器
            config.isCustom = true;
            config.name = name;

            // 添加到自定义服务器列表
            currentConfig.customServers[name] = config;

            // 同时添加到 mcpServers 以便加载
            currentConfig.mcpServers[name] = config;

            // 保存配置
            await fs.writeFile(this.configPath, JSON.stringify(currentConfig, null, 2), 'utf-8');

            log.log(`[MCPClientService] ✅ Successfully added custom server: ${name}`);

            // 如果服务器未禁用，立即连接
            if (!config.disabled) {
                await this.connectToServer(name, config);
            }

            return true;
        } catch (e) {
            log.error(`[MCPClientService] ❌ Failed to add custom server ${name}:`, e);
            return false;
        }
    }

    /**
     * 更新自定义 MCP 服务器配置
     * @param name 服务器名称
     * @param config 新的服务器配置
     * @returns 是否更新成功
     */
    async updateCustomServer(name: string, config: MCPServerConfig): Promise<boolean> {
        try {
            log.log(`[MCPClientService] ✏️ Updating custom server: ${name}`);

            // 读取当前配置
            const content = await fs.readFile(this.configPath, 'utf-8');
            const currentConfig: MCPConfig = JSON.parse(content);

            // 检查服务器是否存在且为自定义服务器
            if (!currentConfig.customServers || !currentConfig.customServers[name]) {
                log.error(`[MCPClientService] ❌ Custom server ${name} not found`);
                return false;
            }

            // 保持 isCustom 标记
            config.isCustom = true;
            config.name = name;

            // 更新配置
            currentConfig.customServers[name] = config;
            currentConfig.mcpServers[name] = config;

            // 保存配置
            await fs.writeFile(this.configPath, JSON.stringify(currentConfig, null, 2), 'utf-8');

            log.log(`[MCPClientService] ✅ Successfully updated custom server: ${name}`);

            // 如果服务器正在运行，重新连接以应用新配置
            if (this.clients.has(name)) {
                await this.clients.get(name)?.close();
                this.clients.delete(name);
            }

            // 如果服务器未禁用，重新连接
            if (!config.disabled) {
                await this.connectToServer(name, config);
            }

            return true;
        } catch (e) {
            log.error(`[MCPClientService] ❌ Failed to update custom server ${name}:`, e);
            return false;
        }
    }

    /**
     * 删除自定义 MCP 服务器
     * @param name 服务器名称
     * @returns 是否删除成功
     */
    async removeCustomServer(name: string): Promise<boolean> {
        try {
            log.log(`[MCPClientService] 🗑️ Removing custom server: ${name}`);

            // 读取当前配置
            const content = await fs.readFile(this.configPath, 'utf-8');
            const currentConfig: MCPConfig = JSON.parse(content);

            // 检查服务器是否存在且为自定义服务器
            if (!currentConfig.customServers || !currentConfig.customServers[name]) {
                log.error(`[MCPClientService] ❌ Custom server ${name} not found`);
                return false;
            }

            // 关闭连接（如果正在运行）
            if (this.clients.has(name)) {
                await this.clients.get(name)?.close();
                this.clients.delete(name);
                this.connectionStatus.delete(name);
            }

            // 从配置中删除
            delete currentConfig.customServers[name];
            delete currentConfig.mcpServers[name];

            // 保存配置
            await fs.writeFile(this.configPath, JSON.stringify(currentConfig, null, 2), 'utf-8');

            log.log(`[MCPClientService] ✅ Successfully removed custom server: ${name}`);

            return true;
        } catch (e) {
            log.error(`[MCPClientService] ❌ Failed to remove custom server ${name}:`, e);
            return false;
        }
    }

    /**
     * 获取所有自定义服务器列表
     * @returns 自定义服务器配置列表
     */
    getCustomServers(): Record<string, MCPServerConfig> {
        try {
            // 同步读取（因为这是getter方法）
            const content = fsSync.readFileSync(this.configPath, 'utf-8');
            const config: MCPConfig = JSON.parse(content);
            return config.customServers || {};
        } catch (e) {
            log.warn('[MCPClientService] Failed to read custom servers:', e);
            return {};
        }
    }

    /**
     * 测试服务器连接
     * @param name 服务器名称
     * @param config 服务器配置
     * @returns 连接测试结果
     */
    async testConnection(name: string, config: MCPServerConfig): Promise<{
        success: boolean;
        error?: string;
        duration?: number;
    }> {
        const startTime = Date.now();
        let testClient: Client | undefined;

        try {
            log.log(`[MCPClientService] 🧪 Testing connection for: ${name}`);

            let transport;

            if (config.type === 'streamableHttp' && config.baseUrl) {
                // HTTP transport
                transport = new StreamableHTTPClientTransport(new URL(config.baseUrl), {
                    requestInit: {
                        headers: config.headers || {}
                    }
                });
            } else if (config.command) {
                // Stdio transport
                const finalEnv = { ...(process.env as Record<string, string>), ...config.env };
                transport = new StdioClientTransport({
                    command: config.command,
                    args: config.args || [],
                    env: finalEnv
                });
            } else {
                throw new Error('Invalid server configuration: missing required fields');
            }

            testClient = new Client({
                name: "test-client",
                version: "1.0.0",
            }, {
                capabilities: {},
            });

            // 尝试连接（较短的超时时间）
            await testClient.connect(transport, {
                timeout: 30000,  // 30秒超时
                maxTotalTimeout: 45000  // 最大总超时45秒
            });

            // 列出工具以验证连接正常工作
            await testClient.listTools();

            const duration = Date.now() - startTime;

            log.log(`[MCPClientService] ✅ Connection test successful for ${name} (${duration}ms)`);

            // 关闭测试连接
            await testClient.close();

            return { success: true, duration };
        } catch (e) {
            const error = e as Error;
            const duration = Date.now() - startTime;

            // 关闭测试连接（如果已建立）
            if (testClient) {
                try {
                    await testClient.close();
                } catch (closeError) {
                    // 忽略关闭错误
                }
            }

            log.error(`[MCPClientService] ❌ Connection test failed for ${name} (${duration}ms):`, error.message);

            return {
                success: false,
                error: error.message,
                duration
            };
        }
    }

    /**
     * 验证 MCP 配置的有效性
     * @param config 待验证的配置
     * @returns 验证结果
     */
    validateConfig(config: MCPConfig): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 检查所有服务器配置
        const allServers = {
            ...config.mcpServers,
            ...config.customServers
        };

        for (const [name, serverConfig] of Object.entries(allServers)) {
            // 检查必需字段
            if (serverConfig.type === 'streamableHttp') {
                if (!serverConfig.baseUrl) {
                    errors.push(`${name}: Missing required field 'baseUrl' for HTTP server`);
                }
                // 验证 URL 格式
                try {
                    if (serverConfig.baseUrl) {
                        new URL(serverConfig.baseUrl);
                    }
                } catch (e) {
                    errors.push(`${name}: Invalid URL format for 'baseUrl'`);
                }
            } else if (serverConfig.type === 'stdio' || !serverConfig.type) {
                if (!serverConfig.command) {
                    errors.push(`${name}: Missing required field 'command' for stdio server`);
                }
            }

            // 检查占位符（警告）
            if (serverConfig.env) {
                for (const [key, value] of Object.entries(serverConfig.env)) {
                    if (this.isPlaceholder(value)) {
                        warnings.push(`${name}: Environment variable '${key}' contains placeholder`);
                    }
                }
            }

            if (serverConfig.headers) {
                for (const [key, value] of Object.entries(serverConfig.headers)) {
                    if (this.isPlaceholder(value)) {
                        warnings.push(`${name}: Header '${key}' contains placeholder`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 检测配置是否不完整或缺少有效服务器
     * @returns 是否需要修复
     */
    private detectIncompleteConfig(config: MCPConfig): boolean {
        let hasValidServer = false;

        for (const [name, serverConfig] of Object.entries(config.mcpServers || {})) {
            if (!serverConfig.disabled) {
                const isStdio = !serverConfig.type || serverConfig.type === 'stdio';
                const isHttp = serverConfig.type === 'streamableHttp';

                // 检查 stdio 类型服务器的必需字段
                if (isStdio && (!serverConfig.command || !serverConfig.args)) {
                    log.warn(`[MCP] Server ${name} is enabled but missing command/args`);
                    continue;
                }

                // 检查 HTTP 类型服务器的必需字段
                if (isHttp && !serverConfig.baseUrl) {
                    log.warn(`[MCP] Server ${name} is enabled but missing baseUrl`);
                    continue;
                }

                hasValidServer = true;
            }
        }

        return !hasValidServer;
    }

    /**
     * 智能合并配置：从模板中添加缺失的服务器，修复不完整的配置
     * 保留用户自定义设置（disabled、env、headers）
     */
    private async repairAndMergeConfig(userConfig: MCPConfig): Promise<MCPConfig> {
        const templatePath = path.join(process.env.APP_ROOT || process.cwd(), 'resources', 'mcp-templates.json');

        try {
            // 读取模板配置
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            const templateConfig: MCPConfig = JSON.parse(templateContent);

            // 合并策略：模板提供默认值，用户配置覆盖
            for (const [name, templateServer] of Object.entries(templateConfig.mcpServers || {})) {
                if (!userConfig.mcpServers[name]) {
                    // 模板中有但用户配置中没有，直接添加
                    userConfig.mcpServers[name] = templateServer;
                    log.log(`[MCPClientService] ➕ Added server ${name} from template`);
                } else {
                    // 用户配置中有，但可能不完整，智能合并
                    const userServer = userConfig.mcpServers[name];

                    // 保留用户的自定义设置
                    userConfig.mcpServers[name] = {
                        ...templateServer,  // 模板提供完整的默认配置
                        disabled: userServer.disabled !== undefined ? userServer.disabled : templateServer.disabled,
                        env: { ...templateServer.env, ...userServer.env },
                        headers: { ...templateServer.headers, ...userServer.headers }
                    };

                    log.log(`[MCPClientService] 🔄 Merged config for ${name}`);
                }
            }

            // 保存修复后的配置
            await fs.writeFile(this.configPath, JSON.stringify(userConfig, null, 2), 'utf-8');
            log.log('[MCPClientService] ✅ Config repaired and merged with template');

            return userConfig;
        } catch (e) {
            log.error('[MCPClientService] Failed to repair and merge config:', e);
            return userConfig;
        }
    }

    /**
     * 修复不完整的 MCP 配置 (已弃用，使用 repairAndMergeConfig 代替)
     * 从模板中补充缺失的 command 和 args 字段
     * @deprecated
     */
    private async repairIncompleteConfig(config: MCPConfig): Promise<{
        repaired: boolean;
        config: MCPConfig;
        repairedServers: string[];
    }> {
        const templatePath = path.join(process.env.APP_ROOT || process.cwd(), 'resources', 'mcp-templates.json');
        let repaired = false;
        const repairedServers: string[] = [];

        try {
            // 读取模板配置
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            const templateConfig = JSON.parse(templateContent) as MCPConfig;

            // 检查并修复每个服务器配置
            for (const [name, serverConfig] of Object.entries(config.mcpServers || {})) {
                // 检查是否缺少必需字段
                if (!serverConfig.command || !serverConfig.args) {
                    // 从模板中查找完整配置
                    if (templateConfig.mcpServers && templateConfig.mcpServers[name]) {
                        const template = templateConfig.mcpServers[name];

                        // 保留用户的 disabled 状态和自定义 env
                        config.mcpServers[name] = {
                            ...template,
                            disabled: serverConfig.disabled !== undefined ? serverConfig.disabled : template.disabled,
                            env: { ...template.env, ...serverConfig.env }
                        };

                        repaired = true;
                        repairedServers.push(name);
                        log.log(`[MCPClientService] ✅ Repaired config for ${name}`);
                    } else {
                        log.log(`[MCPClientService] 🧹 No template found for ${name}, removing incomplete config`);
                        delete config.mcpServers[name];
                    }
                }
            }

            // 如果有修复，保存配置
            if (repaired) {
                await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
                log.log(`[MCPClientService] ✅ Repaired ${repairedServers.length} server(s): ${repairedServers.join(', ')}`);
            }
        } catch (e) {
            log.error('[MCPClientService] Failed to repair config:', e);
        }

        return { repaired, config, repairedServers };
    }
}
