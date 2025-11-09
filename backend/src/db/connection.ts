import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database.Database | null = null;

export function getDatabase(dbPath?: string): Database.Database {
  if (db) {
    return db;
  }

  const path = dbPath || process.env.DATABASE_PATH || './data/books.db';
  db = new Database(path);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function initializeDatabase(dbPath?: string): Database.Database {
  const database = getDatabase(dbPath);

  // Read and execute schema
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  database.exec(schema);

  return database;
}

export { Database };
