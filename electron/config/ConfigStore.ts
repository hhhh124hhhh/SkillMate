import Store from 'electron-store';
import log from 'electron-log';
import { secureStorage } from '../security/SecureStorage.js';
import { auditLogger } from '../security/AuditLogger.js';

export interface ToolPermission {
    tool: string;           // 'write_file', 'run_command', etc.
    pathPattern?: string;   // Optional: specific path or '*' for all
    grantedAt: number;      // Timestamp
}

export interface UserStyleConfig {
    articles: string[];              // 用户文章路径列表
    styleGuide: {
        openingHabits: string[];      // 开头习惯
        wordChoice: {
            technicalLevel: number;   // 0-10
            colloquialLevel: number;  // 0-10
            humorLevel: number;       // 0-10
        };
        structureHabits: string[];    // 结构习惯
        emotionalTone: string;        // 情感基调
        fullAnalysis?: any;           // 完整分析结果（来自 style-learner）
    };
    lastUpdated: string;              // 最后更新时间
    learningCount: number;            // 学习次数
}

export interface AppConfig {
    apiKey: string;
    doubaoApiKey?: string; // New field
    zhipuApiKey?: string; // New field for Zhipu AI
    apiUrl: string;
    model: string;
    authorizedFolders: string[];
    networkAccess: boolean;
    shortcut: string;
    shortcuts?: Record<string, string>;  // 快捷键绑定配置
    allowedPermissions: ToolPermission[];
    notifications: boolean;
    notificationTypes: {
        workComplete: boolean;
        error: boolean;
        info: boolean;
    };
    userStyleConfig?: UserStyleConfig;  // 个人风格配置
}

const defaults: AppConfig = {
    apiKey: '',
    doubaoApiKey: '', // Default empty
    zhipuApiKey: '', // Default empty
    apiUrl: 'https://open.bigmodel.cn/api/anthropic',
    model: 'GLM-4.7',
    authorizedFolders: [],
    networkAccess: true, // "Open and use" implies network should be on
    shortcut: 'Alt+Space',
    shortcuts: {},  // 快捷键绑定配置
    allowedPermissions: [],
    notifications: true,
    notificationTypes: {
        workComplete: true,
        error: true,
        info: true
    },
    userStyleConfig: {
        articles: [],
        styleGuide: {
            openingHabits: [],
            wordChoice: {
                technicalLevel: 5,
                colloquialLevel: 5,
                humorLevel: 5
            },
            structureHabits: [],
            emotionalTone: ''
        },
        lastUpdated: '',
        learningCount: 0
    }
};

class ConfigStore {
    private store: Store<AppConfig>;

    constructor() {
        this.store = new Store<AppConfig>({
            name: 'wechatflowwork-config',
            defaults
        });

        // 🔒 确保 firstLaunch 字段存在（修复默认值问题）
        if (this.store.get('firstLaunch') === undefined) {
            this.store.set('firstLaunch', true);
            log.log('[ConfigStore] Initialized firstLaunch to true');
        }

        log.log('[ConfigStore] Initialized with path:', this.store.path);
        log.log('[ConfigStore] Current config on init:', {
            apiKey: this.store.get('apiKey') ? '***' + this.store.get('apiKey').slice(-4) : 'empty',
            apiUrl: this.store.get('apiUrl'),
            model: this.store.get('model'),
            firstLaunch: this.store.get('firstLaunch')
        });
    }

    get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        return this.store.get(key);
    }

    set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
        try {
            // 特殊处理 authorizedFolders 的日志
            if (key === 'authorizedFolders') {
                log.log(`[ConfigStore.set] Setting authorizedFolders:`, {
                    count: (value as string[]).length,
                    folders: value
                });
            } else {
                log.log(`[ConfigStore.set] Setting ${key}:`, value);
            }
            this.store.set(key, value);

            // 验证保存
            const saved = this.store.get(key);
            if (key === 'authorizedFolders') {
                log.log(`[ConfigStore.set] Verification for authorizedFolders:`, {
                    savedCount: (saved as string[]).length,
                    saved: saved,
                    equals: JSON.stringify(saved) === JSON.stringify(value)
                });
            } else {
                log.log(`[ConfigStore.set] Verification for ${key}:`, {
                    saved: JSON.stringify(saved),
                    equals: JSON.stringify(saved) === JSON.stringify(value)
                });
            }
        } catch (error) {
            log.error(`[ConfigStore.set] Failed to set ${key}:`, error);
            throw error;
        }
    }

    getAll(): AppConfig {
        // electron-store v11: use .store to access all data
        const data = this.store.store as AppConfig;
        log.log('[ConfigStore.getAll] Returning config:', {
            apiKey: data.apiKey ? '***' + data.apiKey.slice(-4) : 'empty',
            apiUrl: data.apiUrl,
            model: data.model,
            authorizedFoldersCount: data.authorizedFolders?.length || 0,
            authorizedFolders: data.authorizedFolders
        });
        return data;
    }

    // 🔒 API Key（使用加密存储）
    async getApiKey(): Promise<string> {
        const model = this.store.get('model');
        // If using Zhipu model, return Zhipu API key
        if (model && (model.includes('GLM') || model.includes('zhipu') || model.includes('ZHIPU'))) {
            return this.getZhipuApiKey();
        }

        // 🔒 优先从加密存储读取
        try {
            const secureKey = await secureStorage.getApiKey();
            if (secureKey) {
                log.log('[ConfigStore.getApiKey] ✅ Retrieved from secure storage');
                return secureKey;
            }
        } catch (error) {
            log.warn('[ConfigStore.getApiKey] ⚠️ Failed to read from secure storage:', error);
        }

        // Fallback: 从明文存储读取（迁移期兼容）
        const plaintextKey = this.store.get('apiKey');
        if (plaintextKey) {
            log.log('[ConfigStore.getApiKey] ⚠️ Using legacy plaintext storage, please migrate');
            // 自动迁移到加密存储
            await secureStorage.storeApiKey(plaintextKey);
            this.store.set('apiKey', '');
            log.log('[ConfigStore.getApiKey] ✅ Migrated to secure storage');
            return plaintextKey;
        }

        // Fallback: 环境变量
        return process.env.ANTHROPIC_API_KEY || '';
    }

    async setApiKey(key: string): Promise<void> {
        log.log('[ConfigStore.setApiKey] 🔒 Saving apiKey to secure storage, length:', key.length);

        // 🔒 记录审计日志
        await auditLogger.log(
            'auth',
            'api_key_configured',
            {
                hasKey: !!key,
                keyLength: key.length,
                provider: this.store.get('model')
            },
            'info'
        );

        // 🔒 存储到加密存储
        await secureStorage.storeApiKey(key);

        // 🔒 清除明文存储
        this.store.set('apiKey', '');

        log.log('[ConfigStore.setApiKey] ✅ API key encrypted and stored');
    }

    // 🔒 Doubao API Key（使用加密存储）
    async getDoubaoApiKey(): Promise<string> {
        // 🔒 优先从加密存储读取（暂时使用相同的存储机制）
        // TODO: 未来可扩展为支持多个密钥的独立加密

        // Fallback: 从明文存储读取
        const plaintextKey = this.store.get('doubaoApiKey');
        if (plaintextKey) {
            log.log('[ConfigStore.getDoubaoApiKey] Using plaintext storage');
            return plaintextKey;
        }

        // Fallback: 环境变量
        return process.env.DOUBAO_API_KEY || '';
    }

    async setDoubaoApiKey(key: string): Promise<void> {
        log.log('[ConfigStore.setDoubaoApiKey] 🔒 Saving doubaoApiKey');

        // 🔒 存储到加密存储（使用 storeApiKey 机制，带标识）
        // TODO: 未来可扩展为支持多个密钥的独立加密
        this.store.set('doubaoApiKey', key);

        log.log('[ConfigStore.setDoubaoApiKey] ✅ Doubao API key saved');
    }

    // 🔒 Zhipu API Key（使用加密存储）
    async getZhipuApiKey(): Promise<string> {
        // 🔒 优先从加密存储读取（暂时使用相同的存储机制）
        // TODO: 未来可扩展为支持多个密钥的独立加密

        // Fallback: 从明文存储读取
        const plaintextKey = this.store.get('zhipuApiKey');
        if (plaintextKey) {
            log.log('[ConfigStore.getZhipuApiKey] Using plaintext storage');
            return plaintextKey;
        }

        // Fallback: 环境变量
        return process.env.ZHIPU_API_KEY || '';
    }

    async setZhipuApiKey(key: string): Promise<void> {
        log.log('[ConfigStore.setZhipuApiKey] 🔒 Saving zhipuApiKey');

        // 🔒 存储到加密存储
        // TODO: 未来可扩展为支持多个密钥的独立加密
        this.store.set('zhipuApiKey', key);

        log.log('[ConfigStore.setZhipuApiKey] ✅ Zhipu API key saved');
    }

    // Model
    getModel(): string {
        return this.store.get('model');
    }

    setModel(model: string): void {
        this.store.set('model', model);
    }

    // API URL
    getApiUrl(): string {
        const model = this.store.get('model');
        // If using Zhipu model, use fixed Zhipu API URL
        if (model && (model.includes('GLM') || model.includes('zhipu') || model.includes('ZHIPU'))) {
            return 'https://open.bigmodel.cn/api/anthropic';
        }
        // Otherwise use configured API URL
        return this.store.get('apiUrl');
    }

    setApiUrl(url: string): void {
        this.store.set('apiUrl', url);
    }

    // Authorized Folders
    getAuthorizedFolders(): string[] {
        return this.store.get('authorizedFolders') || [];
    }

    addAuthorizedFolder(folder: string): void {
        const folders = this.getAuthorizedFolders();
        if (!folders.includes(folder)) {
            folders.push(folder);
            this.store.set('authorizedFolders', folders);
        }
    }

    removeAuthorizedFolder(folder: string): void {
        const folders = this.getAuthorizedFolders().filter(f => f !== folder);
        this.store.set('authorizedFolders', folders);
    }

    // Network Access
    getNetworkAccess(): boolean {
        return this.store.get('networkAccess');
    }

    setNetworkAccess(enabled: boolean): void {
        this.store.set('networkAccess', enabled);
    }

    // Tool Permissions
    getAllowedPermissions(): ToolPermission[] {
        return this.store.get('allowedPermissions') || [];
    }

    addPermission(tool: string, pathPattern?: string): void {
        const permissions = this.getAllowedPermissions();
        // Check if already exists
        const exists = permissions.some(p =>
            p.tool === tool && p.pathPattern === (pathPattern || '*')
        );
        if (!exists) {
            permissions.push({
                tool,
                pathPattern: pathPattern || '*',
                grantedAt: Date.now()
            });
            this.store.set('allowedPermissions', permissions);

            // 🔒 记录审计日志
            auditLogger.log(
                'permission',
                'permission_granted',
                {
                    tool,
                    pathPattern: pathPattern || '*'
                },
                'info'
            );
        }
    }

    removePermission(tool: string, pathPattern?: string): void {
        const permissions = this.getAllowedPermissions().filter(p =>
            !(p.tool === tool && p.pathPattern === (pathPattern || '*'))
        );
        this.store.set('allowedPermissions', permissions);

        // 🔒 记录审计日志
        auditLogger.log(
            'permission',
            'permission_revoked',
            {
                tool,
                pathPattern: pathPattern || '*'
            },
            'warning'
        );
    }

    hasPermission(tool: string, path?: string): boolean {
        const permissions = this.getAllowedPermissions();
        return permissions.some(p => {
            if (p.tool !== tool) return false;
            if (p.pathPattern === '*') return true;
            if (!path) return p.pathPattern === '*';
            // Check if path matches pattern (simple prefix match)
            return path.startsWith(p.pathPattern || '');
        });
    }

    clearAllPermissions(): void {
        this.store.set('allowedPermissions', []);
    }

    // First Launch Management
    getFirstLaunch(): boolean {
        const value = this.store.get('firstLaunch');
        // 如果 key 不存在，返回 true（首次启动）
        if (value === undefined) {
            // 显式设置默认值
            this.store.set('firstLaunch', true);
            log.log('[ConfigStore] getFirstLaunch: undefined, setting to true');
            return true;
        }
        log.log('[ConfigStore] getFirstLaunch:', value);
        return value as boolean;
    }

    setFirstLaunch(value: boolean): void {
        this.store.set('firstLaunch', value);
    }

    // ========== 个人风格配置管理 ==========

    getUserStyleConfig(): UserStyleConfig | undefined {
        return this.store.get('userStyleConfig');
    }

    setUserStyleConfig(config: UserStyleConfig): void {
        log.log('[ConfigStore.setUserStyleConfig] Saving style config:', {
            articleCount: config.articles.length,
            learningCount: config.learningCount,
            lastUpdated: config.lastUpdated
        });
        this.store.set('userStyleConfig', config);
    }

    addArticlePath(articlePath: string): void {
        const config = this.getUserStyleConfig();
        if (!config) {
            log.warn('[ConfigStore.addArticlePath] userStyleConfig not initialized');
            return;
        }

        if (!config.articles.includes(articlePath)) {
            config.articles.push(articlePath);
            this.setUserStyleConfig(config);
            log.log('[ConfigStore.addArticlePath] Article path added:', articlePath);
        }
    }

    removeArticlePath(articlePath: string): void {
        const config = this.getUserStyleConfig();
        if (!config) return;

        config.articles = config.articles.filter(path => path !== articlePath);
        this.setUserStyleConfig(config);
        log.log('[ConfigStore.removeArticlePath] Article path removed:', articlePath);
    }

    updateStyleGuide(styleGuide: UserStyleConfig['styleGuide']): void {
        const config = this.getUserStyleConfig();
        if (!config) {
            log.warn('[ConfigStore.updateStyleGuide] userStyleConfig not initialized');
            return;
        }

        config.styleGuide = styleGuide;
        config.lastUpdated = new Date().toISOString();
        config.learningCount += 1;

        this.setUserStyleConfig(config);
        log.log('[ConfigStore.updateStyleGuide] Style guide updated, learning count:', config.learningCount);
    }

    incrementLearningCount(): void {
        const config = this.getUserStyleConfig();
        if (!config) return;

        config.learningCount += 1;
        config.lastUpdated = new Date().toISOString();

        this.store.set('userStyleConfig', config);
        log.log('[ConfigStore.incrementLearningCount] Learning count incremented:', config.learningCount);
    }

    clearStyleConfig(): void {
        const defaultConfig: UserStyleConfig = {
            articles: [],
            styleGuide: {
                openingHabits: [],
                wordChoice: {
                    technicalLevel: 5,
                    colloquialLevel: 5,
                    humorLevel: 5
                },
                structureHabits: [],
                emotionalTone: ''
            },
            lastUpdated: '',
            learningCount: 0
        };

        this.setUserStyleConfig(defaultConfig);
        log.log('[ConfigStore.clearStyleConfig] Style config cleared');
    }
}

export const configStore = new ConfigStore();
