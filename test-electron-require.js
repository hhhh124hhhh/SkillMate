// 测试在 Electron 环境中 require('electron') 的行为
console.log('Testing require("electron") in Electron environment...');

try {
  const electron = require('electron');
  console.log('typeof electron:', typeof electron);
  console.log('electron value:', electron);
  
  if (typeof electron === 'string') {
    console.log('❌ require("electron") returns a string path!');
    console.log('This is the root cause of the problem.');
  } else if (typeof electron === 'object') {
    console.log('✅ require("electron") returns an object');
    console.log('Available keys:', Object.keys(electron));
    
    if (electron.app) {
      console.log('✅ electron.app is available');
      console.log('electron.app.getName():', electron.app.getName());
    } else {
      console.log('❌ electron.app is undefined');
    }
  }
} catch (error) {
  console.error('Error:', error.message);
}
