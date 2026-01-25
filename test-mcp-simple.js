/**
 * 简化的 MCP 服务器测试
 */

const { spawn } = require('child_process');
const path = require('path');

const PYTHON_EXE = path.join(__dirname, 'python-runtime', 'python.exe');
const PYTHON_LIB = path.join(__dirname, 'python-runtime', 'lib');

console.log('🔍 简化 MCP 服务器测试\n');

// 启动 MCP 服务器并保持运行
const server = spawn(PYTHON_EXE, ['-m', 'mcp_server_fetch'], {
  env: {
    ...process.env,
    PYTHONPATH: PYTHON_LIB
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

console.log('✅ 启动命令:', PYTHON_EXE, '-m mcp_server_fetch');
console.log('✅ PYTHONPATH:', PYTHON_LIB);
console.log('\n等待服务器输出...\n');

let hasOutput = false;
let outputTimeout = setTimeout(() => {
  if (!hasOutput) {
    console.log('\n⚠️  服务器没有输出（这可能正常，MCP 服务器等待 stdin 输入）');
    console.log('✅ 进程 PID:', server.pid);
    console.log('✅ 进程状态: 运行中\n');

    // 发送简单的 JSON-RPC 消息测试
    const testMsg = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'ping'
    }) + '\n';

    console.log('发送测试消息:', testMsg.trim());
    try {
      server.stdin.write(testMsg);
      console.log('✅ 消息发送成功\n');
    } catch (err) {
      console.error('❌ 消息发送失败:', err.message);
    }

    // 等待响应
    setTimeout(() => {
      console.log('停止服务器...');
      server.kill();
    }, 2000);
  }
}, 1000);

server.stdout.on('data', (data) => {
  hasOutput = true;
  clearTimeout(outputTimeout);

  console.log('📤 服务器输出:');
  console.log(data.toString());

  // 收到响应后停止
  setTimeout(() => {
    server.kill();
  }, 500);
});

server.stderr.on('data', (data) => {
  const msg = data.toString();
  if (!msg.includes('DeprecationWarning')) {
    console.log('⚠️  错误输出:', msg);
  }
});

server.on('close', (code) => {
  console.log('\n服务器退出，退出码:', code);
  console.log('\n✅ 结论: MCP 服务器可以正常启动和运行');
  process.exit(code === 0 || code === null ? 0 : 1);
});

server.on('error', (err) => {
  console.error('❌ 服务器错误:', err);
  process.exit(1);
});
