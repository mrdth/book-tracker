-- Book Tracker Database Schema
-- Based on specs/001-book-tracker/data-model.md

-- Authors table
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(length(name) > 0)
);

CREATE INDEX IF NOT EXISTS idx_authors_external_id ON authors(external_id);
CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);

-- Books table
CREATE TABLE IF NOT EXISTS books (
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
  CHECK(owned_source IN ('none', 'filesystem', 'manual')),
  CHECK(owned_source != 'manual' OR owned = 1)
);

CREATE INDEX IF NOT EXISTS idx_books_external_id ON books(external_id);
CREATE INDEX IF NOT EXISTS idx_books_deleted ON books(deleted);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);

-- BookAuthor junction table
CREATE TABLE IF NOT EXISTS book_authors (
  book_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  author_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (book_id, author_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
  CHECK(author_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_bookauthor_book ON book_authors(book_id);
CREATE INDEX IF NOT EXISTS idx_bookauthor_author ON book_authors(author_id);

-- Trigger to update updated_at timestamp on books
CREATE TRIGGER IF NOT EXISTS update_books_timestamp
AFTER UPDATE ON books
BEGIN
  UPDATE books SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on authors
CREATE TRIGGER IF NOT EXISTS update_authors_timestamp
AFTER UPDATE ON authors
BEGIN
  UPDATE authors SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
