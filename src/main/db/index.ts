import { app, safeStorage } from 'electron'
import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const userData = app.getPath('userData')
  const dbDir = join(userData, 'data')
  mkdirSync(dbDir, { recursive: true })

  const dbPath = join(dbDir, 'maildrop.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Veritabanı başlatılmadı.')
  return db
}

export function encryptSecret(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('İşletim sistemi şifreleme servisi kullanılamıyor.')
  }
  return safeStorage.encryptString(plain).toString('base64')
}

export function decryptSecret(encoded: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('İşletim sistemi şifreleme servisi kullanılamıyor.')
  }
  return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
}
