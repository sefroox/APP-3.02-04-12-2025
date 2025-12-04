import sqlite3 from 'sqlite3';

export interface Invoice {
  id?: number;
  type: 'incoming' | 'outgoing'; // Eingangs-/Ausgangsrechnung
  title: string;
  amount: number;
  status: string; // z.B. "open" | "paid"
  createdAt?: string;
}

export interface StoredFile {
  id?: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt?: string;
}

export interface DB {
  run(sql: string, params?: any[]): Promise<sqlite3.RunResult>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
}

let dbPromise: Promise<DB> | null = null;

function wrapDatabase(db: sqlite3.Database): DB {
  return {
    run(sql: string, params: any[] = []) {
      return new Promise<sqlite3.RunResult>((resolve, reject) => {
        db.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
          if (err) return reject(err);
          resolve(this);
        });
      });
    },
    all<T = any>(sql: string, params: any[] = []) {
      return new Promise<T[]>((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows as T[]);
        });
      });
    },
    get<T = any>(sql: string, params: any[] = []) {
      return new Promise<T | undefined>((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) return reject(err);
          resolve(row as T | undefined);
        });
      });
    }
  };
}

export async function getDb(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = new Promise<DB>((resolve, reject) => {
      const db = new sqlite3.Database('./data/app.db', (err) => {
        if (err) return reject(err);

        db.serialize(() => {
          db.run(
            `CREATE TABLE IF NOT EXISTS invoices (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              amount REAL NOT NULL,
              status TEXT NOT NULL,
              createdAt TEXT DEFAULT (datetime('now'))
            );`,
            (err2) => {
              if (err2) return reject(err2);
              db.run(
                `CREATE TABLE IF NOT EXISTS files (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  originalName TEXT NOT NULL,
                  storedName TEXT NOT NULL,
                  mimeType TEXT NOT NULL,
                  size INTEGER NOT NULL,
                  createdAt TEXT DEFAULT (datetime('now'))
                );`,
                (err3) => {
                  if (err3) return reject(err3);
                  resolve(wrapDatabase(db));
                }
              );
            }
          );
        });
      });
    });
  }

  return dbPromise;
}
