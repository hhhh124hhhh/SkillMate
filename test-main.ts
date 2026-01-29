import { app, BrowserWindow } from 'electron'

console.log('[Test] app type:', typeof app)
console.log('[Test] BrowserWindow type:', typeof BrowserWindow)

app.whenReady().then(() => {
  console.log('[Test] Electron app is ready!')
  app.quit()
})
