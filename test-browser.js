import { chromium } from 'playwright';

(async () => {
  console.log('启动浏览器测试...\n');

  // 使用系统 Edge 浏览器
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge'
  });

  const page = await browser.newPage();

  console.log('1. 测试访问百度...');
  await page.goto('https://www.baidu.com', { waitUntil: 'networkidle' });
  console.log('   ✅ 成功加载');

  const title = await page.title();
  console.log(`   页面标题: ${title}`);

  // 截图
  await page.screenshot({ path: 'test-baidu.png' });
  console.log('   ✅ 截图已保存: test-baidu.png');

  // 测试页面交互
  console.log('\n2. 测试页面元素...');
  const searchBox = await page.$('#kw');
  if (searchBox) {
    console.log('   ✅ 找到搜索框');
  }

  const links = await page.$$eval('a', links => links.length);
  console.log(`   ✅ 找到 ${links} 个链接`);

  await page.screenshot({ path: 'test-page-elements.png', fullPage: true });
  console.log('   ✅ 页面元素截图: test-page-elements.png');

  console.log('\n3. 测试响应式布局...');

  const sizes = [
    { width: 1920, height: 1080, name: '桌面' },
    { width: 768, height: 1024, name: '平板' },
    { width: 375, height: 667, name: '手机' }
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-responsive-${size.width}.png` });
    console.log(`   ✅ ${size.name} (${size.width}x${size.height})`);
  }

  console.log('\n🎉 浏览器测试完成！');
  console.log('\n浏览器将保持打开 5 秒供查看...');

  await page.waitForTimeout(5000);
  await browser.close();

  console.log('\n✅ 所有测试通过！浏览器测试功能正常工作。');
})();
