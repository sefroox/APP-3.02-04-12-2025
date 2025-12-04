import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ordner für DB-Datei (server/data)
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'invoices.db');

// Ordner sicherstellen
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// DB-Verbindung herstellen
const db = new Database(DB_PATH);

// Tabelle anlegen (falls nicht vorhanden)
db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    amount REAL,
    currency TEXT,
    invoice_date TEXT,
    vendor_name TEXT,
    project_id TEXT,
    cost_center TEXT,
    status TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export default db;

