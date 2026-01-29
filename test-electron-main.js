// 这个文件应该在 Electron 主进程中运行
const electron = require('electron');
console.log('=== Electron Import Test ===');
console.log('electron type:', typeof electron);
console.log('electron.app type:', typeof electron?.app);
console.log('electron.BrowserWindow type:', typeof electron?.BrowserWindow);
console.log('Keys:', Object.keys(electron).slice(0, 10));
