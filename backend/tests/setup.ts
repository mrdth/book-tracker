import { beforeAll, afterAll, afterEach } from 'vitest';
import { getDatabase, closeDatabase, initializeDatabase } from '../src/db/connection.js';
import type { Database } from 'better-sqlite3';

let testDb: Database.Database;

// Use in-memory database for tests
beforeAll(() => {
  testDb = initializeDatabase(':memory:');
});

afterEach(() => {
  // Clean up all tables after each test
  const tables = ['book_authors', 'books', 'authors', 'migrations'];
  for (const table of tables) {
    testDb.prepare(`DELETE FROM ${table}`).run();
  }
});

afterAll(() => {
  closeDatabase();
});

export { testDb };
