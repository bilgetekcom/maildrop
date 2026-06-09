import type { IpcMain } from 'electron'
import { dialog } from 'electron'
import * as XLSX from 'xlsx'
import { getDb } from '../db'

export function registerReportHandlers(ipc: IpcMain): void {
  ipc.handle('reports:exportCampaign', async (_, campaignId: number): Promise<string | null> => {
    const db = getDb()
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as Record<
      string,
      unknown
    >
    if (!campaign) return null

    const logs = db
      .prepare<[number], Record<string, unknown>>(
        `SELECT l.*, c.first_name, c.last_name, c.company
         FROM campaign_logs l
         LEFT JOIN contacts c ON c.id = l.contact_id
         WHERE l.campaign_id = ?
         ORDER BY l.id`
      )
      .all(campaignId)

    const r = await dialog.showSaveDialog({
      title: 'Kampanya raporunu kaydet',
      defaultPath: `kampanya-${campaign.name}-${campaignId}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (r.canceled || !r.filePath) return null

    const summary = [
      ['Kampanya', campaign.name],
      ['Toplam', campaign.total],
      ['Başarılı', campaign.sent],
      ['Başarısız', campaign.failed],
      ['Durum', campaign.status],
      ['Başlangıç', campaign.started_at],
      ['Bitiş', campaign.finished_at]
    ]

    const detail = logs.map((l) => ({
      Ad: l.first_name,
      Soyad: l.last_name,
      Firma: l.company,
      Email: l.email,
      Durum: l.status === 'success' ? 'Başarılı' : 'Başarısız',
      Hata: l.error_msg ?? '',
      Tarih: l.sent_at
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Özet')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), 'Detay')
    XLSX.writeFile(wb, r.filePath)
    return r.filePath
  })

  ipc.handle('reports:removeCampaign', (_, campaignId: number) => {
    getDb().prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId)
  })
}
