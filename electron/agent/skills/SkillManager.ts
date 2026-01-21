import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import { app } from 'electron';
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
    private skillMetadata: Map<string, { description: string; input_schema: Record<string, unknown>; source: 'user' | 'builtin'; filePath: string }> = new Map(); // 懒加载元数据缓存
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
        
        console.log(`[SkillManager] Skills locked to read-only directory: ${this.skillsDir}`);
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
        console.log(`[SkillManager] ⚡ Lazy loaded ${this.skillMetadata.size} skill metadata in ${loadTime}ms`);
    }

    private async loadSkillsFromDirectory(dir: string, source: 'user' | 'builtin') {
        try {
            await fs.access(dir);
        } catch {
            console.log(`[SkillManager] ${source} skills directory not found: ${dir}`);
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
                // Look for SKILL.md inside directory
                const skillMdPath = path.join(filePath, 'SKILL.md');
                try {
                    await fs.access(skillMdPath);
                    loadPromises.push(this.parseSkill(skillMdPath, source));
                } catch {
                    // console.log(`No SKILL.md found in ${file}`);
                }
            } else if (file.endsWith('.md')) {
                // Support legacy single-file skills
                loadPromises.push(this.parseSkill(filePath, source));
            }
        }

        // 并行加载所有技能
        await Promise.all(loadPromises);
    }

    /**
     * 懒加载：仅加载技能元数据（名称、描述），不加载完整指令内容
     * 当需要使用技能时，再加载完整内容
     */
    private async loadSkillMetadataFromDirectory(dir: string, source: 'user' | 'builtin') {
        try {
            await fs.access(dir);
        } catch {
            console.log(`[SkillManager] ${source} skills directory not found: ${dir}`);
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
                    loadPromises.push(this.parseSkillMetadata(skillMdPath, source));
                } catch {
                    // No SKILL.md found
                }
            } else if (file.endsWith('.md')) {
                loadPromises.push(this.parseSkillMetadata(filePath, source));
            }
        }

        // 并行加载所有技能元数据
        await Promise.all(loadPromises);
    }

    /**
     * 解析技能元数据（懒加载模式）
     * 只读取 frontmatter，不读取完整 instructions
     */
    private async parseSkillMetadata(filePath: string, source: 'user' | 'builtin' = 'builtin') {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const parts = content.split('---');
            if (parts.length < 3) return;

            const frontmatter = yaml.load(parts[1]) as {
                name?: string;
                description?: string;
                input_schema?: Record<string, unknown>;
            } | undefined;

            if (frontmatter?.name && frontmatter?.description) {
                // 只存储元数据，不存储 instructions
                this.skillMetadata.set(frontmatter.name, {
                    description: frontmatter.description,
                    input_schema: frontmatter.input_schema || { type: 'object', properties: {} },
                    source,
                    filePath
                });
            }
        } catch (e) {
            console.error(`Failed to load skill metadata from ${filePath}`, e);
        }
    }

    private async parseSkill(filePath: string, source: 'user' | 'builtin' = 'builtin') {
        const startTime = Date.now();
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const parts = content.split('---');
            if (parts.length < 3) return; // Invalid frontmatter structure

            const frontmatter = yaml.load(parts[1]) as {
                name?: string;
                description?: string;
                input_schema?: Record<string, unknown>;
                encryption?: EncryptedSkillData;
            } | undefined;

            let instructions: string;

            // 🔒 Check if content is encrypted
            if (frontmatter?.encryption) {
                // Encrypted skill - decrypt it
                try {
                    instructions = this.encryption.decrypt(frontmatter.encryption);
                    console.log(`[SkillManager] 🔓 Decrypted ${frontmatter.name} from ${filePath}`);
                } catch (decryptError) {
                    console.error(`[SkillManager] ❌ Failed to decrypt ${filePath}:`, decryptError);
                    // Fallback: try to read as plaintext
                    instructions = parts.slice(2).join('---').trim();
                }
            } else {
                // Plaintext skill (development mode or legacy format)
                instructions = parts.slice(2).join('---').trim();
            }

            if (frontmatter && frontmatter.name && frontmatter.description) {
                const loadTime = Date.now() - startTime;
                console.log(`[SkillManager] ✅ Loaded [${source}] ${frontmatter.name} (desc: ${frontmatter.description}, inst len: ${instructions.length}, load time: ${loadTime}ms)`);
                this.skills.set(frontmatter.name, {
                    name: frontmatter.name,
                    description: frontmatter.description,
                    input_schema: frontmatter.input_schema || { type: 'object', properties: {} },
                    instructions: instructions,
                    source,
                    filePath,
                    _lazy: false
                });

                // 缓存 instructions
                if (this.cacheEnabled) {
                    this.instructionsCache.set(frontmatter.name, instructions);
                }
            } else {
                console.warn(`[SkillManager] Invalid frontmatter in ${filePath}`);
            }
        } catch (e) {
            console.error(`Failed to load skill from ${filePath}`, e);
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
            console.error(`Failed to load instructions for ${name}`, e);
            return undefined;
        }
    }

    getTools() {
        // 懒加载模式：从元数据返回工具列表
        if (this.skillMetadata.size > 0) {
            return Array.from(this.skillMetadata.entries()).map(([name, metadata]) => ({
                name,
                description: metadata.description,
                input_schema: metadata.input_schema
            }));
        }

        // 兼容旧模式：从 skills Map 返回
        return Array.from(this.skills.values()).map(skill => ({
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
        return this.getSkillInfo(name)?.instructions;
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
}
