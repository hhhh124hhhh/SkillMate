#!/usr/bin/env node
/**
 * 快速修复百度千帆 MCP 配置
 *
 * 用法：node scripts/fix-baidu-mcp-config.js "您的API密钥"
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

async function fixBaiduConfig(apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    console.error('❌ 请提供百度千帆 API Key');
    console.log('\n用法: node scripts/fix-baidu-mcp-config.js "您的API密钥"');
    console.log('\n获取 API Key:');
    console.log('  1. 访问: https://console.bce.baidu.com/iam/#/iam/apikey/list');
    console.log('  2. 创建 API Key（选择"千帆AppBuilder"）');
    process.exit(1);
  }

  const configPath = path.join(os.homedir(), '.aiagent', 'mcp.json');

  try {
    // 读取配置
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    // 更新 baidu-search 配置
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    config.mcpServers['baidu-search'] = {
      description: '百度千帆AI搜索 - 实时信息检索与总结，支持使用大模型进行回复（需要百度千帆 API Key）',
      type: 'streamableHttp',
      baseUrl: 'https://ai.baidu.com/appbuilder/v2/ai_search/mcp/sse',
      headers: {
        Authorization: `Bearer+${apiKey.trim()}`
      },
      disabled: false,
      env: {}
    };

    // 备份原配置
    const backupPath = `${configPath}.backup.${Date.now()}`;
    await fs.writeFile(backupPath, content, 'utf-8');
    console.log(`✅ 已备份原配置到: ${backupPath}`);

    // 保存新配置
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✅ 配置已保存到:', configPath);
    console.log('\n配置内容:');
    console.log(JSON.stringify(config.mcpServers['baidu-search'], null, 2));

    console.log('\n✅ 修复完成！');
    console.log('\n下一步:');
    console.log('  1. 重启应用: npm run dev');
    console.log('  2. 在聊天中测试: "搜索 2026 年人工智能最新进展"');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  }
}

// 获取命令行参数
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('❌ 请提供百度千帆 API Key');
  console.log('\n用法: node scripts/fix-baidu-mcp-config.js "您的API密钥"');
  console.log('\n获取 API Key:');
  console.log('  1. 访问: https://console.bce.baidu.com/iam/#/iam/apikey/list');
  console.log('  2. 创建 API Key（选择"千帆AppBuilder"）');
  process.exit(1);
}

fixBaiduConfig(apiKey);
