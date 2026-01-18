// 测试首次启动引导页面
// 使用方法：在 DevTools Console 中运行此脚本

// 方法1：通过 IPC 直接调用
window.ipcRenderer.invoke('config:get-first-launch').then(result => {
    console.log('当前 firstLaunch 值:', result);

    // 强制设置为 true 以显示引导页面
    window.ipcRenderer.invoke('config:set', 'firstLaunch', true).then(() => {
        console.log('已设置 firstLaunch = true');
        console.log('请刷新页面 (Ctrl+R) 查看引导页面');
    });
});

// 方法2：手动触发（推荐）
// 在 Console 中运行：
// localStorage.removeItem('firstLaunch');
// location.reload();
