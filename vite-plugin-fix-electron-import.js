import fs from 'node:fs'
import path from 'node:path'

/**
 * Vite 插件：修复 vite-plugin-electron 错误编译 electron 导入的 bug
 *
 * 问题：vite-plugin-electron 将 `import { app } from 'electron'` 编译成 `const electron = require('electron')`
 * 修复：替换所有 `electron.xxx` 引用为直接使用 `xxx`
 */
export function fixElectronImportPlugin() {
  return {
    name: 'fix-electron-import',
    writeBundle() {
      const mainCjsPath = path.resolve('dist-electron/main.cjs')

      if (!fs.existsSync(mainCjsPath)) {
        return
      }

      let code = fs.readFileSync(mainCjsPath, 'utf-8')

      // 检查是否需要修复
      if (!code.includes('const electron = require("electron")')) {
        return
      }

      // 步骤 1: 将 `const electron = require("electron")` 替换为解构导入
      code = code.replace(
        /const electron = require\("electron"\);/,
        `const { app, BrowserWindow, shell, ipcMain, screen, dialog, globalShortcut, Tray, Menu, nativeImage } = require("electron");`
      )

      // 步骤 2: 替换所有 electron.app -> app
      code = code.replace(/\belectron\.app\./g, 'app.')

      // 步骤 3: 替换所有 electron.BrowserWindow -> BrowserWindow
      code = code.replace(/\belectron\.BrowserWindow/g, 'BrowserWindow')

      // 步骤 4: 替换其他 electron.xxx 引用
      code = code.replace(/\belectron\.shell\./g, 'shell.')
      code = code.replace(/\belectron\.ipcMain\./g, 'ipcMain.')
      code = code.replace(/\belectron\.screen\./g, 'screen.')
      code = code.replace(/\belectron\.dialog\./g, 'dialog.')
      code = code.replace(/\belectron\.globalShortcut\./g, 'globalShortcut.')
      code = code.replace(/\belectron\.Tray\./g, 'Tray.')
      code = code.replace(/\belectron\.Menu\./g, 'Menu.')
      code = code.replace(/\belectron\.nativeImage\./g, 'nativeImage.')

      // 步骤 5: 删除文件中其他可能的重复解构声明
      code = code.replace(/const \{[^}]*\} = electron;?\n/g, '')

      fs.writeFileSync(mainCjsPath, code, 'utf-8')
      console.log('\n✓ [fix-electron-import] Patched dist-electron/main.cjs')
    }
  }
}
