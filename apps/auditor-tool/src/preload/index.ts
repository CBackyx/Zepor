import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  generateProofFromMarkdown: (data: any) => ipcRenderer.invoke('generate-proof-from-markdown', data),
  selectKeyFile: () => ipcRenderer.invoke('select-key-file'),
  chooseSaveLocation: (signerId: string) => ipcRenderer.invoke('choose-save-location', signerId)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
