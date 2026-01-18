import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { app } from 'electron';
import { SkillEncryption, EncryptedSkillData } from '../../security/SkillEncryption.js';

export interface SkillDefinition {
    name: string;
    description: string;
    instructions: string;
    input_schema: Record<string, unknown>;
}

export class SkillManager {
    private skillsDir: string;
    private skills: Map<string, SkillDefinition> = new Map();
    private encryption: SkillEncryption;

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

        this.skills.clear();
        try {
            await fs.access(this.skillsDir);
        } catch {
            return; // No skills directory
        }

        const files = await fs.readdir(this.skillsDir);
        for (const file of files) {
            const filePath = path.join(this.skillsDir, file);
            let stats;
            try {
                stats = await fs.stat(filePath);
            } catch { continue; }

            if (stats.isDirectory()) {
                // Look for SKILL.md inside directory
                const skillMdPath = path.join(filePath, 'SKILL.md');
                try {
                    await fs.access(skillMdPath);
                    await this.parseSkill(skillMdPath);
                } catch {
                    // console.log(`No SKILL.md found in ${file}`);
                }
            } else if (file.endsWith('.md')) {
                // Support legacy single-file skills
                await this.parseSkill(filePath);
            }
        }
        console.log(`Loaded ${this.skills.size} skills`);
    }

    private async parseSkill(filePath: string) {
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
                console.log(`[SkillManager] ✅ Loaded ${frontmatter.name} (desc: ${frontmatter.description}, inst len: ${instructions.length}, load time: ${loadTime}ms)`);
                this.skills.set(frontmatter.name, {
                    name: frontmatter.name,
                    description: frontmatter.description,
                    input_schema: frontmatter.input_schema || { type: 'object', properties: {} },
                    instructions: instructions
                });
            } else {
                console.warn(`[SkillManager] Invalid frontmatter in ${filePath}`);
            }
        } catch (e) {
            console.error(`Failed to load skill from ${filePath}`, e);
        }
    }

    getTools() {
        return Array.from(this.skills.values()).map(skill => ({
            name: skill.name,
            description: skill.description,
            input_schema: skill.input_schema
        }));
    }

    getSkillInstructions(name: string): string | undefined {
        return this.getSkillInfo(name)?.instructions;
    }

    getSkillInfo(name: string): { instructions: string, skillDir: string } | undefined {
        // Try exact match first
        let skill = this.skills.get(name);
        let skillName = name;

        // Try underscore/hyphen swap if not found
        if (!skill) {
            const alternativeName = name.includes('_') ? name.replace(/_/g, '-') : name.replace(/-/g, '_');
            skill = this.skills.get(alternativeName);
            if (skill) skillName = alternativeName;
        }

        if (!skill) return undefined;

        // Return both instructions and the skill directory path
        const skillDir = path.join(this.skillsDir, skillName);
        return {
            instructions: skill.instructions,
            skillDir: skillDir
        };
    }
}
