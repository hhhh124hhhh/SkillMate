import path from 'path';
import fs from 'fs';
import log from 'electron-log';
import { configStore } from '../../config/ConfigStore.js';

export interface TrustedProject {
    path: string;
    trustedAt: number;
    lastUsed: number;
}

export class PermissionManager {
    private authorizedFolders: Set<string> = new Set();
    private networkAccess: boolean = false;
    private trustedProjects: Map<string, TrustedProject> = new Map();

    constructor() {
        // Load from persisted config
        const savedFolders = configStore.getAuthorizedFolders();
        savedFolders.forEach((f: string) => this.authorizedFolders.add(path.resolve(f)));

        // Load trusted projects
        const savedProjects = configStore.getTrustedProjects();
        savedProjects.forEach((p: TrustedProject) => {
            this.trustedProjects.set(path.resolve(p.path), {
                ...p,
                path: path.resolve(p.path)
            });
        });
    }

    authorizeFolder(folderPath: string): boolean {
        const normalized = path.resolve(folderPath);
        // Security check: never allow root directories
        if (normalized === '/' || normalized === 'C:\\' || normalized.match(/^[A-Z]:\\$/)) {
            log.warn('Attempted to authorize root directory, denied.');
            return false;
        }
        this.authorizedFolders.add(normalized);
        log.log(`Authorized folder: ${normalized}`);
        return true;
    }

    revokeFolder(folderPath: string): void {
        const normalized = path.resolve(folderPath);
        this.authorizedFolders.delete(normalized);
    }

    isPathAuthorized(filePath: string): boolean {
        const normalized = path.resolve(filePath);

        // 防止路径遍历攻击
        for (const folder of this.authorizedFolders) {
            try {
                // 检查路径是否在授权目录内（不在外部）
                const relative = path.relative(folder, normalized);

                // 如果相对路径不以 .. 开头且不是绝对路径，说明在授权目录内
                if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
                    // 额外检查：解析符号链接，防止链接到授权目录外
                    try {
                        const realPath = fs.realpathSync.native(normalized);
                        const realRelative = path.relative(folder, realPath);

                        if (!realRelative.startsWith('..') && !path.isAbsolute(realRelative)) {
                            return true;
                        }
                    } catch (realPathError) {
                        // 文件不存在或无法解析符号链接，使用原始路径
                        return true;
                    }
                }
            } catch (error) {
                // 路径计算出错，跳过此文件夹
                log.warn(`Path authorization check failed for ${normalized}: ${error}`);
                continue;
            }
        }

        return false;
    }

    getAuthorizedFolders(): string[] {
        return Array.from(this.authorizedFolders);
    }

    setNetworkAccess(enabled: boolean): void {
        this.networkAccess = enabled;
    }

    isNetworkAccessEnabled(): boolean {
        return this.networkAccess;
    }

    /**
     * 信任项目 - 一次性信任整个项目目录
     * 项目必须包含 .git 或 package.json
     */
    trustProject(projectPath: string): boolean {
        const normalized = path.resolve(projectPath);

        // 验证是否为有效项目（包含 .git 或 package.json）
        if (!this.isValidProject(normalized)) {
            log.warn(`Not a valid project directory: ${normalized}`);
            return false;
        }

        // 添加到信任列表
        this.trustedProjects.set(normalized, {
            path: normalized,
            trustedAt: Date.now(),
            lastUsed: Date.now()
        });

        // 同时授权该目录
        this.authorizeFolder(normalized);

        // 持久化到配置
        configStore.setTrustedProjects(Array.from(this.trustedProjects.values()));

        log.log(`Trusted project: ${normalized}`);
        return true;
    }

    /**
     * 取消信任项目
     */
    revokeTrust(projectPath: string): void {
        const normalized = path.resolve(projectPath);
        this.trustedProjects.delete(normalized);

        // 同时取消授权
        this.revokeFolder(normalized);

        // 持久化到配置
        configStore.setTrustedProjects(Array.from(this.trustedProjects.values()));

        log.log(`Revoked trust for project: ${normalized}`);
    }

    /**
     * 检查路径是否在信任项目内
     */
    isProjectTrusted(filePath: string): boolean {
        const normalized = path.resolve(filePath);

        // 检查是否在信任项目列表中
        for (const [trustedPath, project] of this.trustedProjects) {
            if (normalized.startsWith(trustedPath + path.sep) || normalized === trustedPath) {
                // 更新最后使用时间
                project.lastUsed = Date.now();
                return true;
            }
        }

        return false;
    }

    /**
     * 获取所有信任项目
     */
    getTrustedProjects(): TrustedProject[] {
        return Array.from(this.trustedProjects.values());
    }

    /**
     * 验证是否为有效项目目录
     * 必须包含 .git 或 package.json
     */
    private isValidProject(projectPath: string): boolean {
        // 检查是否包含 .git 目录
        const gitDir = path.join(projectPath, '.git');
        if (fs.existsSync(gitDir)) return true;

        // 检查是否包含 package.json
        const packageJson = path.join(projectPath, 'package.json');
        if (fs.existsSync(packageJson)) return true;

        return false;
    }
}

export const permissionManager = new PermissionManager();
