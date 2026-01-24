/**
 * 技能系统演示脚本
 * 演示如何使用各种技能
 */

import { SkillManager } from './electron/agent/skills/SkillManager.js';

async function demoSkills() {
    console.log('========================================');
    console.log('  SkillMate - 技能系统演示');
    console.log('========================================\n');

    // 初始化技能管理器
    const skillManager = new SkillManager();
    await skillManager.loadSkills();

    // 获取所有工具
    const tools = skillManager.getTools();

    console.log(`✅ 已加载 ${tools.length} 个技能\n`);

    // 按类别展示技能
    const categories = {
        '📚 文档处理': ['pdf-processor', 'xlsx-analyzer', 'docx-editor', 'pptx-processor'],
        '🎨 设计创作': ['canvas-design', 'algorithmic-art', 'frontend-design'],
        '🛠️ 开发工具': ['skill-creator', 'mcp-server-builder', 'webapp-testing'],
        '🔄 开发工作流': ['brainstorming', 'test-driven-development', 'systematic-debugging', 'verification-before-completion'],
        '🔧 Git工作流': ['using-git-worktrees', 'requesting-code-review', 'receiving-code-review', 'finishing-development'],
        '📢 内部通信': ['internal-comms']
    };

    console.log('📋 技能分类索引：\n');

    for (const [category, skillNames] of Object.entries(categories)) {
        console.log(`${category}`);
        for (const skillName of skillNames) {
            const tool = tools.find(t => t.name === skillName);
            if (tool) {
                console.log(`  ✓ ${tool.name.padEnd(25)} ${tool.description.substring(0, 50)}...`);
            }
        }
        console.log('');
    }

    console.log('========================================\n');

    // 演示 1: 文档处理技能
    console.log('📚 演示 1: 文档处理技能\n');
    console.log('使用场景: 提取 PDF 文本');
    console.log('用户输入: "提取 document.pdf 中的所有文本和表格"\n');
    console.log('AI 会自动使用 pdf-processor 技能...\n');

    const pdfSkill = await skillManager.getSkillInfo('pdf-processor');
    if (pdfSkill) {
        console.log('✅ 技能已加载');
        console.log(`📄 技能目录: ${pdfSkill.skillDir}`);
        console.log(`📝 指令长度: ${pdfSkill.instructions.length} 字符`);
        console.log(`\n指令预览:\n${pdfSkill.instructions.substring(0, 200)}...\n`);
    }

    // 演示 2: 开发工作流技能
    console.log('========================================\n');
    console.log('🔄 演示 2: 开发工作流技能\n');
    console.log('使用场景: 使用 TDD 开发功能');
    console.log('用户输入: "使用 test-driven-development 技能帮我开发用户认证"\n');

    const tddSkill = await skillManager.getSkillInfo('test-driven-development');
    if (tddSkill) {
        console.log('✅ 技能已加载');
        console.log(`📝 指令长度: ${tddSkill.instructions.length} 字符`);
        console.log(`\n铁律:\n${tddSkill.instructions.substring(0, 300)}...\n`);
    }

    // 演示 3: 设计创作技能
    console.log('========================================\n');
    console.log('🎨 演示 3: 设计创作技能\n');
    console.log('使用场景: 设计前端界面');
    console.log('用户输入: "使用 frontend-design 设计一个登录页面"\n');

    const designSkill = await skillManager.getSkillInfo('frontend-design');
    if (designSkill) {
        console.log('✅ 技能已加载');
        console.log(`📝 指令长度: ${designSkill.instructions.length} 字符`);
        console.log(`\n设计思维:\n${designSkill.instructions.substring(0, 300)}...\n`);
    }

    // 性能测试
    console.log('========================================\n');
    console.log('⚡ 性能测试\n');

    console.log('测试 1: 懒加载性能');
    console.log('启动时仅加载元数据（名称、描述），使用时才加载完整内容...\n');

    const startTime1 = Date.now();
    await skillManager.loadSkills();
    const loadTime1 = Date.now() - startTime1;
    console.log(`✅ 懒加载 ${tools.length} 个技能元数据: ${loadTime1}ms\n`);

    console.log('测试 2: 缓存性能');
    console.log('第二次加载同一技能应该使用缓存...\n');

    const startTime2 = Date.now();
    await skillManager.getSkillInfo('pdf-processor');
    const cacheTime = Date.now() - startTime2;
    console.log(`✅ 从缓存加载 pdf-processor: ${cacheTime}ms (应该很快)\n`);

    console.log('========================================\n');
    console.log('🎉 技能系统演示完成！\n');
    console.log('💡 提示: 在应用中直接与 AI 对话即可自动使用这些技能\n');
    console.log('📖 查看完整文档:');
    console.log('   - 技能索引: docs/skills-index.md');
    console.log('   - 快速开始: docs/quick-start.md\n');
}

// 运行演示
demoSkills().catch(console.error);
