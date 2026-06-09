import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  SmtpAccount,
  SmtpAccountInput,
  SmtpTestResult,
  Contact,
  ContactGroup,
  Template,
  Campaign,
  CampaignLog,
  SendProgress
} from '../shared/types'

const api = {
  smtp: {
    list: (): Promise<SmtpAccount[]> => ipcRenderer.invoke('smtp:list'),
    create: (input: SmtpAccountInput): Promise<SmtpAccount> =>
      ipcRenderer.invoke('smtp:create', input),
    update: (id: number, input: Partial<SmtpAccountInput>): Promise<SmtpAccount> =>
      ipcRenderer.invoke('smtp:update', id, input),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('smtp:remove', id),
    test: (input: SmtpAccountInput, sampleTo: string): Promise<SmtpTestResult> =>
      ipcRenderer.invoke('smtp:test', input, sampleTo),
    setDefault: (id: number): Promise<void> => ipcRenderer.invoke('smtp:setDefault', id)
  },
  contacts: {
    list: (search?: string, groupId?: number | null): Promise<Contact[]> =>
      ipcRenderer.invoke('contacts:list', search, groupId),
    create: (input: Omit<Contact, 'id' | 'createdAt'>): Promise<Contact> =>
      ipcRenderer.invoke('contacts:create', input),
    update: (id: number, input: Partial<Contact>): Promise<Contact> =>
      ipcRenderer.invoke('contacts:update', id, input),
    remove: (ids: number[]): Promise<void> => ipcRenderer.invoke('contacts:remove', ids),
    importExcel: (
      filePath: string,
      mapping: Record<string, string>
    ): Promise<{ inserted: number; duplicates: string[] }> =>
      ipcRenderer.invoke('contacts:importExcel', filePath, mapping),
    previewExcel: (filePath: string): Promise<{ headers: string[]; sample: string[][] }> =>
      ipcRenderer.invoke('contacts:previewExcel', filePath),
    exportExcel: (path: string, groupId?: number | null): Promise<void> =>
      ipcRenderer.invoke('contacts:exportExcel', path, groupId)
  },
  groups: {
    list: (): Promise<ContactGroup[]> => ipcRenderer.invoke('groups:list'),
    create: (name: string, color: string): Promise<ContactGroup> =>
      ipcRenderer.invoke('groups:create', name, color),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('groups:remove', id)
  },
  templates: {
    list: (): Promise<Template[]> => ipcRenderer.invoke('templates:list'),
    get: (id: number): Promise<Template> => ipcRenderer.invoke('templates:get', id),
    create: (
      input: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'variables'>
    ): Promise<Template> => ipcRenderer.invoke('templates:create', input),
    update: (id: number, input: Partial<Template>): Promise<Template> =>
      ipcRenderer.invoke('templates:update', id, input),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('templates:remove', id),
    preview: (id: number, contactId: number): Promise<{ subject: string; html: string }> =>
      ipcRenderer.invoke('templates:preview', id, contactId)
  },
  campaigns: {
    list: (): Promise<Campaign[]> => ipcRenderer.invoke('campaigns:list'),
    get: (id: number): Promise<Campaign> => ipcRenderer.invoke('campaigns:get', id),
    logs: (id: number): Promise<CampaignLog[]> => ipcRenderer.invoke('campaigns:logs', id),
    start: (input: {
      name: string
      templateId: number
      smtpId: number
      contactIds: number[]
      ratePerSecond?: number
      scheduleAt?: string
    }): Promise<Campaign> => ipcRenderer.invoke('campaigns:start', input),
    pause: (id: number): Promise<void> => ipcRenderer.invoke('campaigns:pause', id),
    resume: (id: number): Promise<void> => ipcRenderer.invoke('campaigns:resume', id),
    cancel: (id: number): Promise<void> => ipcRenderer.invoke('campaigns:cancel', id),
    retryFailed: (id: number): Promise<void> => ipcRenderer.invoke('campaigns:retryFailed', id),
    onProgress: (cb: (p: SendProgress) => void): (() => void) => {
      const listener = (_: unknown, p: SendProgress): void => cb(p)
      ipcRenderer.on('campaigns:progress', listener)
      return () => ipcRenderer.removeListener('campaigns:progress', listener)
    }
  },
  dialog: {
    openExcel: (): Promise<string | null> => ipcRenderer.invoke('dialog:openExcel'),
    saveExcel: (defaultName: string): Promise<string | null> =>
      ipcRenderer.invoke('dialog:saveExcel', defaultName),
    openAttachment: (): Promise<string | null> => ipcRenderer.invoke('dialog:openAttachment')
  },
  reports: {
    exportCampaign: (campaignId: number): Promise<string | null> =>
      ipcRenderer.invoke('reports:exportCampaign', campaignId),
    removeCampaign: (campaignId: number): Promise<void> =>
      ipcRenderer.invoke('reports:removeCampaign', campaignId)
  },
  appLifecycle: {
    confirmClose: (): Promise<void> => ipcRenderer.invoke('app:confirmClose'),
    cancelClose: (): Promise<void> => ipcRenderer.invoke('app:cancelClose'),
    openExternal: (url: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('app:openExternal', url),
    onBeforeClose: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('app:beforeClose', listener)
      return () => ipcRenderer.removeListener('app:beforeClose', listener)
    }
  },
  updater: {
    check: (): Promise<{ ok: boolean; version: string | null; currentVersion: string; error?: string }> =>
      ipcRenderer.invoke('updater:check'),
    download: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('updater:download'),
    install: (): Promise<void> => ipcRenderer.invoke('updater:install'),
    currentVersion: (): Promise<string> => ipcRenderer.invoke('updater:currentVersion'),
    onEvent: (cb: (event: string, payload: unknown) => void): (() => void) => {
      const channels = [
        'updater:checking',
        'updater:available',
        'updater:not-available',
        'updater:progress',
        'updater:downloaded',
        'updater:error'
      ]
      const listeners: Array<[string, (...args: unknown[]) => void]> = channels.map((ch) => {
        const l = (_: unknown, payload: unknown): void => cb(ch, payload)
        ipcRenderer.on(ch, l as never)
        return [ch, l as never]
      })
      return () => listeners.forEach(([ch, l]) => ipcRenderer.removeListener(ch, l))
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (e) {
    console.error(e)
  }
} else {
  // @ts-ignore window is non-isolated
  window.electron = electronAPI
  // @ts-ignore window is non-isolated
  window.api = api
}

export type Api = typeof api
