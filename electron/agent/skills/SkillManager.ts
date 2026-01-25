import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import { app } from 'electron';
import log from 'electron-log';
import { SkillEncryption, EncryptedSkillData } from '../../security/SkillEncryption.js';

export interface SkillDefinition {
    name: string;
    description: string;
    instructions: string;
    input_schema: Record<string, unknown>;
    source: 'user' | 'builtin';
    filePath: string;
    _lazy?: boolean; // 标记是否为懒加载
}

export class SkillManager {
    private skillsDir: string;
    private skills: Map<string, SkillDefinition> = new Map();
    private skillMetadata: Map<string, { name?: string; description: string; input_schema: Record<string, unknown>; source: 'user' | 'builtin'; filePath: string }> = new Map(); // 懒加载元数据缓存
    private encryption: SkillEncryption;
    private instructionsCache: Map<string, string> = new Map(); // 指令内容缓存
    private cacheEnabled: boolean = true; // 缓存开关

    constructor() {
        // [Security] Default to dev path, will be updated in initializeDefaults for production
        // We no longer use the user's home directory to prevent modification
        this.skillsDir = path.join(process.cwd(), 'resources', 'skills');
        // Initialize encryption module
        this.encryption = new SkillEncryption();
    }

    async initializeDefaults() {
        // [Security] Locate the read-only resources directory
        if (app.isPackaged) {
            const possiblePath = path.join(process.resourcesPath, 'resources', 'skills');
            const fallbackPath = path.join(process.resourcesPath, 'skills');
            
            try {
                await fs.access(possiblePath);
                this.skillsDir = possiblePath;
            } catch {
                this.skillsDir = fallbackPath;
            }
        }
        
        log.info(`[SkillManager] Skills locked to read-only directory: ${this.skillsDir}`);
        // [Security] Copy logic removed to ensure stability
    }

    async loadSkills() {
        await this.initializeDefaults(); // Ensure defaults are installed before loading

        // 清空缓存
        this.skills.clear();
        this.skillMetadata.clear();
        this.instructionsCache.clear();

        const startTime = Date.now();

        // 并行加载用户技能和内置技能的元数据（懒加载）
        const userSkillsDir = path.join(os.homedir(), '.aiagent', 'skills');
        await Promise.all([
            this.loadSkillMetadataFromDirectory(userSkillsDir, 'user'),
            this.loadSkillMetadataFromDirectory(this.skillsDir, 'builtin')
        ]);

        const loadTime = Date.now() - startTime;
        log.info(`[SkillManager] ⚡ Lazy loaded ${this.skillMetadata.size} skill metadata in ${loadTime}ms`);
    }

    /**
     * 懒加载：仅加载技能元数据（名称、描述），不加载完整指令内容
     * 当需要使用技能时，再加载完整内容
     */
    private async loadSkillMetadataFromDirectory(dir: string, source: 'user' | 'builtin') {
        try {
            await fs.access(dir);
        } catch {
            log.info(`[SkillManager] ${source} skills directory not found: ${dir}`);
            return;
        }

        const files = await fs.readdir(dir);
        const loadPromises: Promise<void>[] = [];

        for (const file of files) {
            const filePath = path.join(dir, file);
            let stats;
            try {
                stats = await fs.stat(filePath);
            } catch { continue; }

            if (stats.isDirectory()) {
                const skillMdPath = path.join(filePath, 'SKILL.md');
                try {
                    await fs.access(skillMdPath);
                    // 提取目录名作为技能 ID
                    const skillId = file;
                    loadPromises.push(this.parseSkillMetadata(skillMdPath, source, skillId));
                } catch {
                    // No SKILL.md found
                }
            } else if (file.endsWith('.md')) {
                // 单文件技能，使用文件名（不含 .md）作为 ID
                const skillId = file.replace(/\.md$/, '');
                loadPromises.push(this.parseSkillMetadata(filePath, source, skillId));
            }
        }

        // 并行加载所有技能元数据
        await Promise.all(loadPromises);
    }

    /**
     * 解析技能元数据（懒加载模式）
     * 只读取 frontmatter，不读取完整 instructions
     * @param filePath SKILL.md 文件路径
     * @param source 技能来源（user/builtin）
     * @param skillId 技能 ID（使用目录名）
     */
    private async parseSkillMetadata(filePath: string, source: 'user' | 'builtin' = 'builtin', skillId: string) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const parts = content.split('---');
            if (parts.length < 3) return;

            const frontmatter = yaml.load(parts[1]) as {
                name?: string;
                description?: string;
                input_schema?: Record<string, unknown>;
            } | undefined;

            if (frontmatter?.description) {
                // 使用 skillId 作为键，同时保存中文名称
                this.skillMetadata.set(skillId, {
                    name: frontmatter.name || skillId, // 保存中文名称用于显示
                    description: frontmatter.description,
                    input_schema: frontmatter.input_schema || { type: 'object', properties: {} },
                    source,
                    filePath
                });
            }
        } catch (e) {
            log.error(`Failed to load skill metadata from ${filePath}`, e);
        }
    }

    /**
     * 按需加载完整的技能指令内容
     * 用于懒加载模式
     */
    private async loadSkillInstructions(name: string): Promise<string | undefined> {
        // 检查缓存
        if (this.cacheEnabled && this.instructionsCache.has(name)) {
            return this.instructionsCache.get(name);
        }

        // 从元数据中获取文件路径
        const metadata = this.skillMetadata.get(name);
        if (!metadata) {
            return undefined;
        }

        try {
            const content = await fs.readFile(metadata.filePath, 'utf-8');
            const parts = content.split('---');
            if (parts.length < 3) return undefined;

            const frontmatter = yaml.load(parts[1]) as {
                encryption?: EncryptedSkillData;
            } | undefined;

            let instructions: string;

            if (frontmatter?.encryption) {
                instructions = this.encryption.decrypt(frontmatter.encryption);
            } else {
                instructions = parts.slice(2).join('---').trim();
            }

            // 缓存 instructions
            if (this.cacheEnabled) {
                this.instructionsCache.set(name, instructions);
            }

            return instructions;
        } catch (e) {
            log.error(`Failed to load instructions for ${name}`, e);
            return undefined;
        }
    }

    getTools() {
        // ✅ 保留的核心技能列表（白名单模式）
        const allowedSkills = new Set([
            // 通用创作类
            'wechat-writing',      // 全流程创作助手
            'ai-writer',           // AI写作工具
            'brainstorming',       // 头脑风暴
            'style-learner',       // 风格学习
            'natural-writer',      // 去AI味润色

            // 辅助工具类
            'get_current_time',    // 获取时间
            'data-analyzer',       // 数据分析

            // 设计类
            'algorithmic-art',     // 算法艺术
            'article-illustrator', // 文章插图
            'canvas-design',       // 画布设计
            'cover-generator',     // 封面生成
            'image-cropper',       // 图片裁剪
            'image-generation',    // 图片生成

            // 办公/文档类
            'docx-editor',         // Word编辑
            'pdf-processor',       // PDF处理
            'pptx-processor',      // PPT处理
        ]);

        // 懒加载模式：从元数据返回工具列表
        if (this.skillMetadata.size > 0) {
            return Array.from(this.skillMetadata.entries())
                .filter(([id]) => allowedSkills.has(id))
                .map(([id, metadata]) => ({
                    name: id,
                    description: metadata.description,
                    input_schema: metadata.input_schema
                }));
        }

        // 兼容旧模式：从 skills Map 返回
        return Array.from(this.skills.values())
            .filter(skill => allowedSkills.has(skill.name))
            .map(skill => ({
                name: skill.name,
                description: skill.description,
                input_schema: skill.input_schema
            }));
    }

    async getSkillInstructions(name: string): Promise<string | undefined> {
        // 懒加载模式：按需加载指令
        if (this.skillMetadata.size > 0) {
            // 先检查是否已加载到 skills Map
            const skill = this.skills.get(name);
            if (skill && !skill._lazy) {
                return skill.instructions;
            }

            // 按需加载
            const instructions = await this.loadSkillInstructions(name);
            if (instructions) {
                // 缓存到 skills Map
                const metadata = this.skillMetadata.get(name);
                if (metadata) {
                    this.skills.set(name, {
                        name,
                        description: metadata.description,
                        input_schema: metadata.input_schema,
                        instructions,
                        source: metadata.source,
                        filePath: metadata.filePath,
                        _lazy: false
                    });
                }
                return instructions;
            }

            return undefined;
        }

        // 兼容旧模式
        const skillInfo = await this.getSkillInfo(name);
        return skillInfo?.instructions;
    }

    async getSkillInfo(name: string): Promise<{ instructions: string, skillDir: string } | undefined> {
        // Try exact match first
        let skill = this.skills.get(name);
        let skillName = name;
        let metadata = this.skillMetadata.get(name);

        // Try underscore/hyphen swap if not found
        if (!skill && !metadata) {
            const alternativeName = name.includes('_') ? name.replace(/_/g, '-') : name.replace(/-/g, '_');
            skill = this.skills.get(alternativeName);
            metadata = this.skillMetadata.get(alternativeName);
            if (skill || metadata) skillName = alternativeName;
        }

        // 懒加载模式：按需加载指令
        if (metadata && (!skill || skill._lazy)) {
            const instructions = await this.loadSkillInstructions(skillName);
            if (instructions) {
                this.skills.set(skillName, {
                    name: skillName,
                    description: metadata.description,
                    input_schema: metadata.input_schema,
                    instructions,
                    source: metadata.source,
                    filePath: metadata.filePath,
                    _lazy: false
                });
                skill = this.skills.get(skillName);
            }
        }

        if (!skill) return undefined;

        // Return both instructions and the skill directory path
        const skillDir = path.join(this.skillsDir, skillName);
        return {
            instructions: skill.instructions,
            skillDir: skillDir
        };
    }

    /**
     * 同步版本的 getSkillInfo（兼容旧代码）
     * 如果技能未加载，返回 undefined
     */
    getSkillInfoSync(name: string): { instructions: string, skillDir: string } | undefined {
        let skill = this.skills.get(name);
        let skillName = name;

        if (!skill) {
            const alternativeName = name.includes('_') ? name.replace(/_/g, '-') : name.replace(/-/g, '_');
            skill = this.skills.get(alternativeName);
            if (skill) skillName = alternativeName;
        }

        if (!skill) return undefined;

        const skillDir = path.join(this.skillsDir, skillName);
        return {
            instructions: skill.instructions,
            skillDir: skillDir
        };
    }

    /**
     * ✨ 检查技能是否存在
     * @param name 技能名称
     * @returns 是否存在
     */
    hasSkill(name: string): boolean {
        // 检查 skills Map 和 skillMetadata Map
        if (this.skills.has(name) || this.skillMetadata.has(name)) {
            return true;
        }

        // 尝试下划线/连字符互换
        const alternativeName = name.includes('_') ? name.replace(/_/g, '-') : name.replace(/-/g, '_');
        return this.skills.has(alternativeName) || this.skillMetadata.has(alternativeName);
    }

    /**
     * ✨ 验证技能格式
     * @param content 技能文件内容
     * @returns 验证结果
     */
    validateSkill(content: string): { valid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 检查是否有 frontmatter
        const parts = content.split('---');
        if (parts.length < 3) {
            errors.push('技能文件必须包含 YAML frontmatter（用 --- 包围）');
            return { valid: false, errors, warnings };
        }

        // 解析 frontmatter
        try {
            const frontmatter = yaml.load(parts[1]) as {
                name?: string;
                description?: string;
                input_schema?: Record<string, unknown>;
            } | undefined;

            if (!frontmatter?.name) {
                warnings.push('建议添加 name 字段（技能名称）');
            } else if (!/^[a-z0-9-]+$/.test(frontmatter.name)) {
                errors.push('技能名称只能包含小写字母、数字和连字符');
            }

            if (!frontmatter?.description) {
                errors.push('必须包含 description 字段（技能描述）');
            } else if (frontmatter.description.length < 10) {
                warnings.push('技能描述过短，建议至少 10 个字符');
            }

            // 验证 input_schema 格式
            if (frontmatter?.input_schema) {
                const schema = frontmatter.input_schema as { type?: string; properties?: Record<string, unknown> };
                if (schema.type !== 'object') {
                    errors.push('input_schema.type 必须是 "object"');
                }
            }
        } catch (e) {
            errors.push(`YAML 解析失败: ${(e as Error).message}`);
        }

        // 检查是否有内容
        const instructions = parts.slice(2).join('---').trim();
        if (instructions.length === 0) {
            warnings.push('技能内容为空，建议添加使用说明');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * ✨ 从本地文件导入技能
     * @param filePath 文件路径（.md 或 .zip）
     * @returns 导入结果
     */
    async importSkillFromFile(filePath: string): Promise<{ success: boolean; skillId?: string; error?: string }> {
        try {
            const ext = path.extname(filePath).toLowerCase();

            if (ext === '.md') {
                // 单文件导入
                const content = await fs.readFile(filePath, 'utf-8');
                return await this.saveSkillFromFile(content);
            } else if (ext === '.zip') {
                // ZIP 文件导入（需要 JSZip）
                return await this.importSkillFromZip(filePath);
            } else {
                return {
                    success: false,
                    error: `不支持的文件格式: ${ext}，仅支持 .md 和 .zip`
                };
            }
        } catch (e) {
            const error = e as Error;
            log.error(`[SkillManager] 导入文件失败: ${filePath}`, error);
            return {
                success: false,
                error: `导入失败: ${error.message}`
            };
        }
    }

    /**
     * ✨ 从 ZIP 文件导入技能
     * @param zipPath ZIP 文件路径
     * @returns 导入结果
     */
    private async importSkillFromZip(zipPath: string): Promise<{ success: boolean; skillId?: string; error?: string }> {
        try {
            // 动态导入 JSZip（避免启动时加载）
            const JSZip = (await import('jszip')).default;
            const buffer = await fs.readFile(zipPath);
            const zip = await JSZip.loadAsync(buffer);

            // 查找 SKILL.md
            let skillMdContent: string | null = null;
            let skillName: string | null = null;

            // 遍历 ZIP 文件
            for (const [relativePath, file] of Object.entries(zip.files)) {
                if (file.dir) continue;

                if (relativePath.endsWith('SKILL.md')) {
                    skillMdContent = await file.async('text');
                    // 从路径中提取技能名称
                    const parts = relativePath.split('/');
                    skillName = parts[parts.length - 2] || parts[0].replace('/SKILL.md', '');
                    break;
                }
            }

            if (!skillMdContent) {
                return {
                    success: false,
                    error: 'ZIP 文件中未找到 SKILL.md'
                };
            }

            // 解析技能名称
            if (!skillName) {
                const match = skillMdContent.match(/^name:\s*(.+)$/m);
                skillName = match ? match[1].trim() : 'imported-skill';
            }

            // 验证格式
            const validation = this.validateSkill(skillMdContent);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `格式验证失败: ${validation.errors.join(', ')}`
                };
            }

            // 保存技能
            const result = await this.saveSkill(skillName, skillMdContent);

            // 保存辅助文件
            const userSkillsDir = path.join(os.homedir(), '.aiagent', 'skills', skillName);
            for (const [relativePath, file] of Object.entries(zip.files)) {
                if (file.dir || relativePath.endsWith('SKILL.md')) continue;

                const targetPath = path.join(userSkillsDir, relativePath);
                const targetDir = path.dirname(targetPath);

                // 确保目录存在
                await fs.mkdir(targetDir, { recursive: true });

                // 写入文件
                const content = await file.async('uint8array');
                await fs.writeFile(targetPath, Buffer.from(content));
            }

            return {
                success: true,
                skillId: skillName
            };
        } catch (e) {
            const error = e as Error;
            return {
                success: false,
                error: `ZIP 解压失败: ${error.message}`
            };
        }
    }

    /**
     * ✨ 从文件内容保存技能
     * @param content 技能文件内容
     * @returns 保存结果
     */
    private async saveSkillFromFile(content: string): Promise<{ success: boolean; skillId?: string; error?: string; skipped?: boolean }> {
        // 验证格式
        const validation = this.validateSkill(content);
        if (!validation.valid) {
            return {
                success: false,
                error: `格式验证失败: ${validation.errors.join(', ')}`
            };
        }

        // 解析技能名称
        const match = content.match(/^name:\s*(.+)$/m);
        const skillName = match ? match[1].trim() : 'new-skill';

        // 保存技能（不覆盖已存在的）
        return await this.saveSkill(skillName, content, false);
    }

    /**
     * ✨ 从 URL 导入技能
     * @param url 技能文件 URL
     * @returns 导入结果
     */
    async importSkillFromURL(url: string): Promise<{ success: boolean; skillId?: string; error?: string }> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();
            return await this.saveSkillFromFile(content);
        } catch (e) {
            const error = e as Error;
            log.error(`[SkillManager] 从 URL 导入失败: ${url}`, error);
            return {
                success: false,
                error: `导入失败: ${error.message}`
            };
        }
    }

    /**
     * ✨ 从 GitHub 仓库导入技能集合
     * @param repoUrl GitHub 仓库 URL（如：https://github.com/user/skills-repo）
     * @returns 导入结果
     */
    async importSkillFromGitHub(repoUrl: string): Promise<{ success: boolean; skills?: string[]; error?: string }> {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            // 解析仓库 URL
            const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
            if (!match) {
                return {
                    success: false,
                    error: '无效的 GitHub 仓库 URL'
                };
            }

            const [, user, repo] = match;
            const cloneUrl = `https://github.com/${user}/${repo}.git`;
            const tempDir = path.join(os.tmpdir(), `skills-${Date.now()}`);

            // 克隆仓库
            await execAsync(`git clone --depth 1 ${cloneUrl} "${tempDir}"`);

            // 递归扫描整个仓库，查找所有技能（深度 5 层）
            const foundSkills = await this.scanSkillsRecursively(tempDir, 5);

            if (foundSkills.length === 0) {
                log.warn('[SkillManager] 未找到任何技能文件');
                return {
                    success: false,
                    error: '仓库中未找到任何技能文件（SKILL.md）'
                };
            }

            log.log(`[SkillManager] 找到 ${foundSkills.length} 个技能文件`);

            // 导入所有技能（自动跳过重复）
            const importedSkills: string[] = [];
            const skippedSkills: string[] = [];
            const failedSkills: Array<{ skillId: string; error: string }> = [];

            for (const skillPath of foundSkills) {
                const content = await fs.readFile(skillPath, 'utf-8');
                const result = await this.saveSkillFromFile(content);

                if (result.skipped) {
                    // 跳过已存在的技能
                    if (result.skillId) {
                        skippedSkills.push(result.skillId);
                    }
                } else if (result.success && result.skillId) {
                    // 新导入的技能
                    importedSkills.push(result.skillId);
                } else {
                    // 导入失败
                    const skillName = path.basename(path.dirname(skillPath));
                    failedSkills.push({
                        skillId: skillName,
                        error: result.error || '未知错误'
                    });
                }
            }

            // 清理临时目录
            await fs.rm(tempDir, { recursive: true, force: true });

            // 记录结果
            log.log(`[SkillManager] 导入完成: ${importedSkills.length} 个新增, ${skippedSkills.length} 个跳过, ${failedSkills.length} 个失败`);

            return {
                success: true,
                skills: importedSkills,
                skipped: skippedSkills,
                failed: failedSkills
            };
        } catch (e) {
            const error = e as Error;
            log.error('[SkillManager] GitHub 导入失败', error);
            return {
                success: false,
                error: `导入失败: ${error.message}`
            };
        }
    }

    /**
     * ✨ 扫描目录中的所有技能文件（仅一层）
     * @param dir 目录路径
     * @returns 技能文件路径列表
     */
    private async scanSkillsFromDirectory(dir: string): Promise<string[]> {
        const skillFiles: string[] = [];

        try {
            await fs.access(dir);
        } catch {
            return skillFiles;
        }

        const files = await fs.readdir(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                const skillMdPath = path.join(filePath, 'SKILL.md');
                try {
                    await fs.access(skillMdPath);
                    skillFiles.push(skillMdPath);
                } catch {
                    // 继续扫描
                }
            } else if (file.endsWith('.md') && file !== 'README.md') {
                skillFiles.push(filePath);
            }
        }

        return skillFiles;
    }

    /**
     * ✨ 递归扫描目录中的所有技能文件（包括子目录）
     * @param dir 目录路径
     * @returns 技能文件路径列表
     */
    private async scanSkillsRecursively(dir: string, maxDepth: number = 5): Promise<string[]> {
        const skillFiles: string[] = [];

        try {
            await fs.access(dir);
        } catch {
            return skillFiles;
        }

        const files = await fs.readdir(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                // 先检查当前目录是否有 SKILL.md
                const skillMdPath = path.join(filePath, 'SKILL.md');
                try {
                    await fs.access(skillMdPath);
                    skillFiles.push(skillMdPath);
                } catch {
                    // 如果没有 SKILL.md，递归扫描子目录（限制深度）
                    if (maxDepth > 0) {
                        const subSkills = await this.scanSkillsRecursively(filePath, maxDepth - 1);
                        skillFiles.push(...subSkills);
                    }
                }
            } else if (file.endsWith('.md') && file !== 'README.md') {
                skillFiles.push(filePath);
            }
        }

        return skillFiles;
    }

    /**
     * ✨ 导出技能为 ZIP 文件
     * @param skillId 技能 ID
     * @param outputPath 输出文件路径
     * @returns 导出结果
     */
    async exportSkill(skillId: string, outputPath: string): Promise<{ success: boolean; error?: string }> {
        try {
            // 动态导入 JSZip
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();

            // 获取技能元数据
            const metadata = this.skillMetadata.get(skillId);
            if (!metadata) {
                return {
                    success: false,
                    error: `技能不存在: ${skillId}`
                };
            }

            // 添加 SKILL.md
            const content = await fs.readFile(metadata.filePath, 'utf-8');
            zip.file('SKILL.md', content);

            // 如果是用户技能，添加辅助文件
            if (metadata.source === 'user') {
                const skillDir = path.dirname(metadata.filePath);
                const files = await this.scanSupportingFiles(skillDir);

                for (const file of files) {
                    const relativePath = path.relative(skillDir, file);
                    const fileContent = await fs.readFile(file);
                    zip.file(relativePath, fileContent);
                }
            }

            // 生成 ZIP 文件
            const buffer = await zip.generateAsync({ type: 'nodebuffer' });
            await fs.writeFile(outputPath, buffer);

            return { success: true };
        } catch (e) {
            const error = e as Error;
            log.error(`[SkillManager] 导出技能失败: ${skillId}`, error);
            return {
                success: false,
                error: `导出失败: ${error.message}`
            };
        }
    }

    /**
     * ✨ 扫描技能的辅助文件
     * @param skillDir 技能目录
     * @returns 辅助文件路径列表
     */
    async scanSupportingFiles(skillDir: string): Promise<string[]> {
        const files: string[] = [];

        try {
            const entries = await fs.readdir(skillDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.name === 'SKILL.md' || entry.name.startsWith('.')) {
                    continue;
                }

                const fullPath = path.join(skillDir, entry.name);

                if (entry.isDirectory()) {
                    // 递归扫描子目录
                    const subFiles = await this.scanSupportingFiles(fullPath);
                    files.push(...subFiles);
                } else if (entry.isFile()) {
                    files.push(fullPath);
                }
            }
        } catch (e) {
            log.error(`[SkillManager] 扫描辅助文件失败: ${skillDir}`, e);
        }

        return files;
    }

    /**
     * ✨ 保存技能到用户目录
     * @param skillId 技能 ID
     * @param content 技能内容
     * @returns 保存结果
     */
    async saveSkill(skillId: string, content: string, overwrite: boolean = false): Promise<{ success: boolean; skillId?: string; error?: string; skipped?: boolean }> {
        try {
            const userSkillsDir = path.join(os.homedir(), '.aiagent', 'skills');
            const skillDir = path.join(userSkillsDir, skillId);
            const skillFilePath = path.join(skillDir, 'SKILL.md');

            // 检查技能是否已存在
            const skillExists = await this.skillExists(skillId);

            if (skillExists && !overwrite) {
                log.log(`[SkillManager] 技能已存在，跳过: ${skillId}`);
                return {
                    success: true,
                    skillId,
                    skipped: true
                };
            }

            // 确保目录存在
            await fs.mkdir(skillDir, { recursive: true });

            // 写入 SKILL.md
            await fs.writeFile(skillFilePath, content, 'utf-8');

            // 重新加载技能列表
            await this.loadSkills();

            if (skillExists && overwrite) {
                log.log(`[SkillManager] 技能已覆盖: ${skillId}`);
            } else {
                log.log(`[SkillManager] 技能已保存: ${skillId}`);
            }

            return {
                success: true,
                skillId
            };
        } catch (e) {
            const error = e as Error;
            log.error(`[SkillManager] 保存技能失败: ${skillId}`, error);
            return {
                success: false,
                error: `保存失败: ${error.message}`
            };
        }
    }

    /**
     * ✨ 检查技能是否存在
     * @param skillId 技能 ID
     * @returns 是否存在
     */
    private async skillExists(skillId: string): Promise<boolean> {
        try {
            const userSkillsDir = path.join(os.homedir(), '.aiagent', 'skills');
            const skillFilePath = path.join(userSkillsDir, skillId, 'SKILL.md');
            await fs.access(skillFilePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * ✨ 删除用户技能
     * @param skillId 技能 ID
     * @returns 删除结果
     */
    async deleteSkill(skillId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const metadata = this.skillMetadata.get(skillId);
            if (!metadata) {
                return {
                    success: false,
                    error: `技能不存在: ${skillId}`
                };
            }

            if (metadata.source !== 'user') {
                return {
                    success: false,
                    error: '无法删除内置技能'
                };
            }

            const skillDir = path.dirname(metadata.filePath);
            await fs.rm(skillDir, { recursive: true, force: true });

            // 重新加载技能列表
            await this.loadSkills();

            return { success: true };
        } catch (e) {
            const error = e as Error;
            log.error(`[SkillManager] 删除技能失败: ${skillId}`, error);
            return {
                success: false,
                error: `删除失败: ${error.message}`
            };
        }
    }
}
