import { app, BrowserWindow } from 'electron'

console.log('app type:', typeof app)
console.log('BrowserWindow type:', typeof BrowserWindow)

app.whenReady().then(() => {
  console.log('Electron app is ready!')
  app.quit()
})
