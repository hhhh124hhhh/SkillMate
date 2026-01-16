import Store from 'electron-store';

export interface ToolPermission {
    tool: string;           // 'write_file', 'run_command', etc.
    pathPattern?: string;   // Optional: specific path or '*' for all
    grantedAt: number;      // Timestamp
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
    allowedPermissions: ToolPermission[];
    notifications: boolean;
    notificationTypes: {
        workComplete: boolean;
        error: boolean;
        info: boolean;
    };
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
    allowedPermissions: [],
    notifications: true,
    notificationTypes: {
        workComplete: true,
        error: true,
        info: true
    }
};

class ConfigStore {
    private store: Store<AppConfig>;

    constructor() {
        this.store = new Store<AppConfig>({
            name: 'wechatflowwork-config',
            defaults
        });
        console.log('[ConfigStore] Initialized with path:', this.store.path);
        console.log('[ConfigStore] Current config on init:', {
            apiKey: this.store.get('apiKey') ? '***' + this.store.get('apiKey').slice(-4) : 'empty',
            apiUrl: this.store.get('apiUrl'),
            model: this.store.get('model')
        });
    }

    get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        return this.store.get(key);
    }

    set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
        try {
            console.log(`[ConfigStore.set] Setting ${key}:`, value);
            this.store.set(key, value);

            // 验证保存
            const saved = this.store.get(key);
            console.log(`[ConfigStore.set] Verification for ${key}:`, {
                saved: JSON.stringify(saved),
                equals: JSON.stringify(saved) === JSON.stringify(value)
            });
        } catch (error) {
            console.error(`[ConfigStore.set] Failed to set ${key}:`, error);
            throw error;
        }
    }

    getAll(): AppConfig {
        // electron-store v11: use .store to access all data
        const data = this.store.store as AppConfig;
        console.log('[ConfigStore.getAll] Returning config:', {
            apiKey: data.apiKey ? '***' + data.apiKey.slice(-4) : 'empty',
            apiUrl: data.apiUrl,
            model: data.model
        });
        return data;
    }

    // API Key
    getApiKey(): string {
        const model = this.store.get('model');
        // If using Zhipu model, return Zhipu API key
        if (model && (model.includes('GLM') || model.includes('zhipu') || model.includes('ZHIPU'))) {
            return this.getZhipuApiKey();
        }
        // Otherwise return Anthropic API key
        return this.store.get('apiKey') || process.env.ANTHROPIC_API_KEY || '';
    }

    setApiKey(key: string): void {
        console.log('[ConfigStore.setApiKey] Saving apiKey, length:', key.length);
        this.store.set('apiKey', key);
        console.log('[ConfigStore.setApiKey] Verification after save:', this.store.get('apiKey') ? 'saved' : 'empty');
    }

    // Doubao API Key
    getDoubaoApiKey(): string {
        return this.store.get('doubaoApiKey') || process.env.DOUBAO_API_KEY || '';
    }

    setDoubaoApiKey(key: string): void {
        this.store.set('doubaoApiKey', key);
    }

    // Zhipu API Key
    getZhipuApiKey(): string {
        return this.store.get('zhipuApiKey') || process.env.ZHIPU_API_KEY || '';
    }

    setZhipuApiKey(key: string): void {
        this.store.set('zhipuApiKey', key);
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
        }
    }

    removePermission(tool: string, pathPattern?: string): void {
        const permissions = this.getAllowedPermissions().filter(p =>
            !(p.tool === tool && p.pathPattern === (pathPattern || '*'))
        );
        this.store.set('allowedPermissions', permissions);
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
}

export const configStore = new ConfigStore();
