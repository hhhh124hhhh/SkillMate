import { chromium } from 'playwright';

(async () => {
  // 尝试使用系统安装的浏览器
  let browserPath = null;

  // Windows 常见浏览器路径
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  const { execSync } = await import('child_process');
  for (const path of possiblePaths) {
    try {
      execSync(`test -f "${path}"`, { stdio: 'ignore' });
      browserPath = path;
      console.log(`找到浏览器: ${browserPath}`);
      break;
    } catch {
      // 继续尝试下一个路径
    }
  }

  const browser = await chromium.launch({
    headless: false,
    channel: browserPath ? undefined : 'chrome', // 尝试使用系统 Chrome
    executablePath: browserPath
  });

  const page = await browser.newPage();

  console.log('正在打开应用...');
  await page.goto('http://localhost:5174/', {
    waitUntil: 'networkidle'
  });

  console.log('✅ 页面加载成功');

  // 等待页面完全加载
  await page.waitForTimeout(3000);

  // 截图
  await page.screenshot({ path: 'test-screenshot.png', fullPage: true });
  console.log('✅ 截图已保存到 test-screenshot.png');

  // 检查控制台错误
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // 获取页面标题
  const title = await page.title();
  console.log(`页面标题: ${title}`);

  // 获取页面 URL
  const url = page.url();
  console.log(`当前 URL: ${url}`);

  // 检查页面主要内容
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log(`页面内容长度: ${bodyText.length} 字符`);

  // 检查是否有主要元素
  const buttons = await page.$$eval('button', buttons => buttons.length);
  const inputs = await page.$$eval('input', inputs => inputs.length);
  const textareas = await page.$$eval('textarea', textareas => textareas.length);

  console.log(`\n📊 页面元素统计:`);
  console.log(`- 按钮: ${buttons} 个`);
  console.log(`- 输入框: ${inputs} 个`);
  console.log(`- 文本区域: ${textareas} 个`);

  // 检查控制台错误
  await page.waitForTimeout(2000);
  if (errors.length > 0) {
    console.log(`\n❌ 发现 ${errors.length} 个控制台错误:`);
    errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  } else {
    console.log('\n✅ 没有发现控制台错误');
  }

  // 测试响应式布局 - 改变窗口大小
  console.log('\n📱 测试响应式布局...');

  const sizes = [
    { width: 1920, height: 1080, name: '桌面大屏' },
    { width: 1366, height: 768, name: '笔记本' },
    { width: 768, height: 1024, name: '平板' },
    { width: 375, height: 667, name: '手机' }
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-responsive-${size.width}x${size.height}.png` });
    console.log(`✅ ${size.name} (${size.width}x${size.height}) - 截图已保存`);
  }

  console.log('\n🎉 测试完成！');

  // 保持浏览器打开一段时间，方便手动检查
  console.log('\n浏览器将保持打开 10 秒，你可以手动检查...');
  await page.waitForTimeout(10000);

  await browser.close();
})();
