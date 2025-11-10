-- Migration: Fix manual ownership constraint
-- Issue: The constraint `CHECK(owned_source != 'manual' OR owned = 1)` prevented
-- users from manually marking books as "not owned"
-- Solution: Remove this constraint by recreating the books table

-- Step 1: Create new books table without the problematic constraint
CREATE TABLE IF NOT EXISTS books_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  isbn TEXT,
  description TEXT,
  publication_date TEXT,
  cover_url TEXT,
  owned INTEGER NOT NULL DEFAULT 0,
  owned_source TEXT NOT NULL DEFAULT 'none',
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(length(title) > 0),
  CHECK(owned IN (0, 1)),
  CHECK(deleted IN (0, 1)),
  CHECK(owned_source IN ('none', 'filesystem', 'manual'))
  -- Removed: CHECK(owned_source != 'manual' OR owned = 1)
);

-- Step 2: Copy data from old table to new table
INSERT INTO books_new (id, external_id, title, isbn, description, publication_date, cover_url, owned, owned_source, deleted, created_at, updated_at)
SELECT id, external_id, title, isbn, description, publication_date, cover_url, owned, owned_source, deleted, created_at, updated_at
FROM books;

-- Step 3: Drop old table
DROP TABLE books;

-- Step 4: Rename new table to books
ALTER TABLE books_new RENAME TO books;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_books_external_id ON books(external_id);
CREATE INDEX IF NOT EXISTS idx_books_deleted ON books(deleted);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);

-- Step 6: Recreate trigger
CREATE TRIGGER IF NOT EXISTS update_books_timestamp
AFTER UPDATE ON books
BEGIN
  UPDATE books SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
