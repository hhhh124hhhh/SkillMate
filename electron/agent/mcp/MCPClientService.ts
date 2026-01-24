import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import path from 'path';
import fs from 'fs/promises';
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
}

export interface MCPConfig {
    mcpServers: Record<string, MCPServerConfig>;
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
            // 检查 args 中的占位符
            if (serverConfig.args) {
                for (const arg of serverConfig.args) {
                    if (arg.includes('ALLOWED_') || arg.includes('YOUR_')) {
                        placeholders.push(`${name}:args:${arg}`);
                    }
                }
            }

            // 检查 env 中的占位符
            if (serverConfig.env) {
                for (const [key, value] of Object.entries(serverConfig.env)) {
                    if (value.includes('YOUR_') || value.includes('API_KEY_HERE') || value.includes('API密钥')) {
                        placeholders.push(`${name}:env:${key}`);
                    }
                }
            }
        }

        return placeholders;
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
     * 禁用未配置的服务器，避免连接失败
     */
    private async replaceApiKeys(config: MCPConfig): Promise<void> {
        const serversToRemove: string[] = [];

        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
            if (!serverConfig.env) continue;

            let hasInvalidKey = false;

            for (const [key, value] of Object.entries(serverConfig.env)) {
                if (value.includes('YOUR_BRAVE_API_KEY_HERE') ||
                    value.includes('YOUR_API_KEY_HERE') ||
                    value.includes('API密钥')) {
                    log.warn(`[MCPClientService] ⚠️ ${name} requires ${key} to be configured`);
                    hasInvalidKey = true;
                }
            }

            if (hasInvalidKey) {
                // 禁用此服务器
                delete config.mcpServers[name];
                log.log(`[MCPClientService] 🚫 Disabled ${name} due to missing API key`);
            }
        }

        // 保存更新后的配置
        if (serversToRemove.length > 0) {
            try {
                await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
                log.log('[MCPClientService] ✅ Updated config after removing invalid servers');
            } catch (error) {
                log.error('[MCPClientService] Failed to save config:', error);
            }
        }
    }

    async loadClients() {
        let config: MCPConfig = { mcpServers: {} };

        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            config = JSON.parse(content);
        } catch (e) {
            // Create default config from template
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

        // 🔧 检测并修复占位符
        const placeholders = this.detectPlaceholders(config);
        if (placeholders.length > 0) {
            log.log('[MCPClientService] 🔍 Detected placeholders:', placeholders);

            // 修复文件系统路径
            const filesystemFixed = await this.replaceFilesystemPath(config);
            if (filesystemFixed) {
                log.log('[MCPClientService] ✅ Filesystem path fixed');
            }

            // 处理 API Key 占位符
            await this.replaceApiKeys(config);
        } else {
            log.log('[MCPClientService] ✅ No placeholders found, config is valid');
        }

        // 连接所有服务器
        for (const [key, serverConfig] of Object.entries(config.mcpServers || {})) {
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
                    command: config.command,
                    args: config.args || [],
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

            // 提供诊断建议
            if (error.message.includes('EACCES') || error.message.includes('权限')) {
                log.error(`  💡 建议: 检查应用是否有足够权限启动子进程`);
            } else if (error.message.includes('ENOENT')) {
                log.error(`  💡 建议: 确保 ${config.command} 已正确安装`);
            } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
                log.error(`  💡 建议: 网络连接可能较慢，请检查网络或稍后重试`);
            } else if (error.message.includes('Connection closed') || error.message.includes('ECONNRESET')) {
                log.error(`  💡 建议: MCP 服务器进程启动失败或意外退出`);
                log.error(`  💡 尝试手动运行: ${config.command} ${config.args?.join(' ')}`);
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
}
