import type { IpcMain } from 'electron'
import { dialog } from 'electron'
import ExcelJS from 'exceljs'
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

    const wb = new ExcelJS.Workbook()
    const summary = wb.addWorksheet('Özet')
    summary.columns = [
      { header: 'Alan', key: 'k', width: 14 },
      { header: 'Değer', key: 'v', width: 40 }
    ]
    summary.addRows([
      { k: 'Kampanya', v: campaign.name },
      { k: 'Toplam', v: campaign.total },
      { k: 'Başarılı', v: campaign.sent },
      { k: 'Başarısız', v: campaign.failed },
      { k: 'Durum', v: campaign.status },
      { k: 'Başlangıç', v: campaign.started_at },
      { k: 'Bitiş', v: campaign.finished_at }
    ])

    const detail = wb.addWorksheet('Detay')
    detail.columns = [
      { header: 'Ad', key: 'firstName', width: 18 },
      { header: 'Soyad', key: 'lastName', width: 18 },
      { header: 'Firma', key: 'company', width: 22 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Durum', key: 'status', width: 12 },
      { header: 'Hata', key: 'error', width: 40 },
      { header: 'Tarih', key: 'sentAt', width: 22 }
    ]
    for (const l of logs) {
      detail.addRow({
        firstName: l.first_name,
        lastName: l.last_name,
        company: l.company,
        email: l.email,
        status: l.status === 'success' ? 'Başarılı' : 'Başarısız',
        error: l.error_msg ?? '',
        sentAt: l.sent_at
      })
    }

    await wb.xlsx.writeFile(r.filePath)
    return r.filePath
  })

  ipc.handle('reports:removeCampaign', (_, campaignId: number) => {
    getDb().prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId)
  })
}
