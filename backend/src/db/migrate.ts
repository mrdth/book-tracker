import { getDatabase, initializeDatabase } from './connection.js';
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  id: string;
  name: string;
  sql: string;
}

function getMigrations(): Migration[] {
  // Try multiple possible locations for migrations directory
  // When built by Vite, __dirname is dist, so we need to look in dist/db/migrations
  const possiblePaths = [
    join(__dirname, 'db', 'migrations'), // Production: dist/db/migrations (Vite outputs to dist/)
    join(__dirname, 'migrations'), // Alt: if migrations are in dist/migrations
    join(__dirname, '..', 'db', 'migrations'), // Dev: src/db/migrations compiled to dist/db/migrations
  ];

  let migrationsDir = '';
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      migrationsDir = path;
      console.log(`Found migrations directory at: ${migrationsDir}`);
      break;
    }
  }

  if (!migrationsDir) {
    console.warn(`Migrations directory not found. Tried: ${possiblePaths.join(', ')}`);
    return [];
  }

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  return files.map((file) => {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    const match = file.match(/^(\d+)_(.+)\.sql$/);

    return {
      id: match ? match[1] : file,
      name: match ? match[2] : file,
      sql,
    };
  });
}

function createMigrationsTable(db: ReturnType<typeof getDatabase>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function getAppliedMigrations(db: ReturnType<typeof getDatabase>): Set<string> {
  const rows = db.prepare('SELECT id FROM migrations').all() as Array<{ id: string }>;
  return new Set(rows.map((row) => row.id));
}

function verifyMigrationState(db: ReturnType<typeof getDatabase>): void {
  // Check if sort_name column exists in authors table
  try {
    const result = db.prepare('PRAGMA table_info(authors)').all() as Array<{ name: string }>;
    const columnNames = result.map((col) => col.name);
    const hasSortName = columnNames.includes('sort_name');

    console.log(`Authors table columns: ${columnNames.join(', ')}`);
    console.log(`sort_name column exists: ${hasSortName}`);

    if (!hasSortName) {
      console.warn('WARNING: sort_name column is missing from authors table, but migrations are marked as applied!');
    }
  } catch (error) {
    console.log('Could not verify migration state');
  }
}

export function runMigrations(dbPath?: string): void {
  console.log('Running database migrations...');

  // Ensure data directory exists
  const dataDir = dirname(dbPath || process.env.DATABASE_PATH || './data/books.db');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database with schema
  const db = initializeDatabase(dbPath);

  // Create migrations tracking table
  createMigrationsTable(db);

  // Get all migrations
  const migrations = getMigrations();
  const applied = getAppliedMigrations(db);

  console.log(`Total migrations available: ${migrations.length}`);
  console.log(`Already applied migrations: ${applied.size}`);
  if (applied.size > 0) {
    console.log(`Applied migration IDs: ${Array.from(applied).join(', ')}`);
  }

  let appliedCount = 0;

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      console.log(`  ✓ ${migration.id}_${migration.name} (already applied)`);
      continue;
    }

    console.log(`  → Applying ${migration.id}_${migration.name}...`);

    try {
      console.log(`    SQL: ${migration.sql.substring(0, 100)}...`);
      db.exec(migration.sql);
      db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(
        migration.id,
        migration.name
      );
      console.log(`  ✓ ${migration.id}_${migration.name} applied successfully`);
      appliedCount++;
    } catch (error) {
      console.error(`  ✗ Failed to apply ${migration.id}_${migration.name}:`, error);
      throw error;
    }
  }

  if (appliedCount === 0) {
    console.log('No new migrations to apply.');
  } else {
    console.log(`Applied ${appliedCount} migration(s) successfully.`);
  }

  // Verify that migrations actually took effect
  verifyMigrationState(db);
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}
