import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });

    // Fetch the database file
    const response = await fetch('/cryptic-bench.db');

    if (!response.ok) {
      throw new Error(`Failed to fetch database: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));

    return db;
  })();

  return initPromise;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function isInitialized(): boolean {
  return db !== null;
}
