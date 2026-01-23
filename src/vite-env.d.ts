/// <reference types="vite/client" />
/// <reference types="vite-plugin-electron/electron-env" />
/// <reference types="vite-plugin-electron-renderer/client" />

export interface IpcRendererApi {
    on(channel: string, listener: (event: import('electron').IpcRendererEvent, ...args: unknown[]) => void): () => void;
    off(channel: string, listener: (event: import('electron').IpcRendererEvent, ...args: unknown[]) => void): void;
    send(channel: string, ...args: unknown[]): void;
    invoke(channel: string, ...args: unknown[]): Promise<unknown>;
    // Internal listener management (for browser dev mode)
    _listeners?: Record<string, Set<(...args: unknown[]) => void>>;
    emit?(channel: string, ...args: unknown[]): void;
}

// Electron preload API
export interface ElectronAPI {
    onUpdateAvailable?: (callback: (info: { version: string }) => void) => void;
    onUpdateDownloaded?: (callback: (info: { version: string }) => void) => void;
    onUpdateProgress?: (callback: (progress: number) => void) => void;
    onUpdateNotAvailable?: (callback: () => void) => void;
    onUpdateError?: (callback: (error: string) => void) => void;
    invoke?: (channel: string, ...args: unknown[]) => Promise<unknown>;
}

declare global {
    interface Window {
        ipcRenderer: IpcRendererApi;
        api: ElectronAPI;
        __IS_ELECTRON__?: boolean;
    }
}
