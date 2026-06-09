import type Database from 'better-sqlite3'

interface Migration {
  version: number
  name: string
  up: string
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      CREATE TABLE IF NOT EXISTS smtp_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        secure INTEGER NOT NULL DEFAULT 1,
        user TEXT NOT NULL,
        encrypted_pass TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS contact_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#2E75B6',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL,
        company TEXT,
        custom_fields TEXT NOT NULL DEFAULT '{}',
        group_id INTEGER REFERENCES contact_groups(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
      CREATE INDEX IF NOT EXISTS idx_contacts_group ON contacts(group_id);

      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT NOT NULL DEFAULT '',
        body_html TEXT NOT NULL DEFAULT '',
        variables TEXT NOT NULL DEFAULT '[]',
        attachment_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
        smtp_id INTEGER NOT NULL REFERENCES smtp_accounts(id) ON DELETE RESTRICT,
        total INTEGER NOT NULL DEFAULT 0,
        sent INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        started_at TEXT,
        finished_at TEXT
      );

      CREATE TABLE IF NOT EXISTS campaign_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        status TEXT NOT NULL,
        error_msg TEXT,
        sent_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_logs_campaign ON campaign_logs(campaign_id);
    `
  }
]

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  const applied = new Set(
    db
      .prepare<[], { version: number }>('SELECT version FROM _migrations')
      .all()
      .map((r) => r.version)
  )

  const insert = db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)')
  for (const m of migrations) {
    if (applied.has(m.version)) continue
    db.transaction(() => {
      db.exec(m.up)
      insert.run(m.version, m.name)
    })()
  }
}
