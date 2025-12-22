import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      generateProofFromMarkdown: (data: any) => Promise<{ filePath: string; fileHash: string }>
      selectKeyFile: () => Promise<{ filePath: string | null; content: string | null }>
      chooseSaveLocation: (signerId: string) => Promise<{ filePath: string | null }>
    }
  }
}
